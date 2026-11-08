<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_customer_can_register(): void
    {
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
}
