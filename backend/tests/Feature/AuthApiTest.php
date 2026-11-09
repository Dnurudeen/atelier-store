<?php

namespace Tests\Feature;

use App\Mail\WelcomeUserMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_customer_can_register(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Ada Okonkwo',
            'email' => 'ada@atelier.test',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'ada@atelier.test')
            ->assertJsonPath('data.user.roles.0', 'customer')
            ->assertJsonStructure(['data' => ['user' => ['id', 'name', 'email', 'roles'], 'token']]);

        $this->assertDatabaseHas('users', ['email' => 'ada@atelier.test', 'role' => 'customer']);
        Mail::assertSent(WelcomeUserMail::class);
    }

    public function test_vendor_register_creates_pending_store(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Kemi Arts',
            'email' => 'kemi@atelier.test',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'role' => 'vendor',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.roles.0', 'vendor');

        $this->assertDatabaseHas('stores', [
            'status' => 'pending',
        ]);
    }

    public function test_register_validates_unique_email_and_password_confirmation(): void
    {
        $this->makeUser(['email' => 'taken@atelier.test']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Dup',
            'email' => 'taken@atelier.test',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Mismatch',
            'email' => 'new@atelier.test',
            'password' => 'secret12',
            'password_confirmation' => 'different',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_login_returns_token_and_rejects_bad_credentials(): void
    {
        $this->makeUser(['email' => 'buyer@atelier.test', 'password' => 'password']);

        $ok = $this->postJson('/api/v1/auth/login', [
            'email' => 'buyer@atelier.test',
            'password' => 'password',
        ]);

        $ok->assertOk()->assertJsonStructure(['data' => ['user', 'token']]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'buyer@atelier.test',
            'password' => 'wrong',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_me_and_logout_require_auth(): void
    {
        $user = $this->makeUser();

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();

        $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);

        $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'api_token' => null]);

        $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    public function test_google_sign_in_creates_user_and_requires_onboarding(): void
    {
        Mail::fake();
        config(['services.google.client_id' => 'atelier-google-client.apps.googleusercontent.com']);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'atelier-google-client.apps.googleusercontent.com',
                'sub' => 'google-sub-123',
                'email' => 'google.user@atelier.test',
                'email_verified' => 'true',
                'name' => 'Google User',
                'picture' => 'https://example.com/a.png',
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/auth/google', [
            'id_token' => 'fake-google-id-token',
            'role' => 'customer',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'google.user@atelier.test')
            ->assertJsonPath('data.user.needs_onboarding', true)
            ->assertJsonPath('data.user.has_google', true)
            ->assertJsonStructure(['data' => ['token', 'user', 'is_new']]);

        $user = User::where('email', 'google.user@atelier.test')->first();
        $this->assertNotNull($user);
        $this->assertSame('google-sub-123', $user->google_id);
        $this->assertNull($user->onboarding_completed_at);
        Mail::assertSent(WelcomeUserMail::class);

        $this->withHeaders($this->authHeaders($user->fresh()))
            ->postJson('/api/v1/auth/complete-onboarding', [
                'name' => 'Google User',
                'phone' => '08031112222',
            ])
            ->assertOk()
            ->assertJsonPath('data.needs_onboarding', false)
            ->assertJsonPath('data.phone', '08031112222');

        $this->assertNotNull($user->fresh()->onboarding_completed_at);
    }

    public function test_google_sign_in_links_existing_email_account(): void
    {
        config(['services.google.client_id' => 'atelier-google-client.apps.googleusercontent.com']);
        $existing = $this->makeUser(['email' => 'linked@atelier.test', 'phone' => '08010000000']);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'atelier-google-client.apps.googleusercontent.com',
                'sub' => 'google-sub-linked',
                'email' => 'linked@atelier.test',
                'email_verified' => true,
                'name' => 'Linked User',
            ], 200),
        ]);

        $this->postJson('/api/v1/auth/google', [
            'id_token' => 'fake-google-id-token',
        ])->assertOk()
            ->assertJsonPath('data.user.id', $existing->id)
            ->assertJsonPath('data.user.needs_onboarding', false)
            ->assertJsonPath('data.is_new', false);

        $this->assertSame('google-sub-linked', $existing->fresh()->google_id);
    }

    public function test_google_sign_in_rejects_bad_audience(): void
    {
        config(['services.google.client_id' => 'expected-client-id']);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'wrong-client',
                'sub' => 'x',
                'email' => 'x@atelier.test',
                'email_verified' => 'true',
            ], 200),
        ]);

        $this->postJson('/api/v1/auth/google', [
            'id_token' => 'bad-token',
        ])->assertStatus(422);
    }
}
