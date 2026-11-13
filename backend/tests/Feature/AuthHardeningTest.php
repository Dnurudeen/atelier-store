<?php

namespace Tests\Feature;

use App\Mail\PasswordResetMail;
use App\Mail\VerifyEmailMail;
use App\Models\Order;
use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AuthHardeningTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function bearer(string $token): array
    {
        return ['Authorization' => 'Bearer '.$token, 'Accept' => 'application/json'];
    }

    public function test_tokens_are_stored_hashed_and_support_multiple_devices(): void
    {
        $user = $this->makeUser(['email' => 'multi@atelier.test', 'password' => 'secret123']);

        $a = $this->postJson('/api/v1/auth/login', ['email' => 'multi@atelier.test', 'password' => 'secret123'])->json('data.token');
        $b = $this->postJson('/api/v1/auth/login', ['email' => 'MULTI@atelier.test', 'password' => 'secret123'])->json('data.token');

        $this->assertNotSame($a, $b);
        $this->withHeaders($this->bearer($a))->getJson('/api/v1/auth/me')->assertOk();
        $this->withHeaders($this->bearer($b))->getJson('/api/v1/auth/me')->assertOk();

        [, $secret] = explode('|', $a, 2);
        $this->assertDatabaseMissing('personal_access_tokens', ['token' => $secret]);
        $this->assertDatabaseHas('personal_access_tokens', ['token' => hash('sha256', $secret)]);
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_expired_and_tampered_tokens_are_rejected(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('web', 1);

        $this->withHeaders($this->bearer($token.'x'))->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->withHeaders($this->bearer('not-a-token'))->getJson('/api/v1/auth/me')->assertUnauthorized();

        $this->travel(2)->days();
        $this->withHeaders($this->bearer($token))->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_logout_all_devices_and_session_list(): void
    {
        $user = $this->makeUser();
        $current = $user->createToken('laptop');
        $user->createToken('phone');
        $user->createToken('tablet');

        $this->withHeaders($this->bearer($current))->getJson('/api/v1/auth/sessions')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->withHeaders($this->bearer($current))->postJson('/api/v1/auth/logout-all', ['keep_current' => true])->assertOk();
        $this->assertSame(1, PersonalAccessToken::count());
        $this->withHeaders($this->bearer($current))->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_suspended_users_cannot_sign_in_or_use_tokens(): void
    {
        $user = $this->makeUser(['email' => 'sus@atelier.test', 'password' => 'secret123']);
        $token = $user->createToken();
        $user->update(['status' => 'suspended']);

        $this->postJson('/api/v1/auth/login', ['email' => 'sus@atelier.test', 'password' => 'secret123'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
        $this->withHeaders($this->bearer($token))->getJson('/api/v1/auth/me')
            ->assertForbidden()->assertJsonPath('code', 'account_suspended');
    }

    public function test_password_rules_require_eight_chars_with_letters_and_numbers(): void
    {
        foreach (['short1', 'onlyletters', '12345678'] as $weak) {
            $this->postJson('/api/v1/auth/register', [
                'name' => 'Ada', 'email' => 'weak'.$weak.'@atelier.test',
                'password' => $weak, 'password_confirmation' => $weak,
            ])->assertStatus(422)->assertJsonValidationErrors('password');
        }
    }

    public function test_registration_sends_verification_and_link_verifies(): void
    {
        Mail::fake();

        $res = $this->postJson('/api/v1/auth/register', [
            'name' => 'Ada', 'email' => 'Verify@Atelier.test',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertCreated()->assertJsonPath('data.user.email_verified', false);

        $this->assertSame('verify@atelier.test', $res->json('data.user.email'));

        $plain = null;
        Mail::assertSent(VerifyEmailMail::class, function (VerifyEmailMail $mail) use (&$plain) {
            $plain = $mail->token;

            return true;
        });

        $this->postJson('/api/v1/auth/verify-email', ['email' => 'verify@atelier.test', 'token' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/v1/auth/verify-email', ['email' => 'verify@atelier.test', 'token' => $plain])
            ->assertOk()->assertJsonPath('data.email_verified', true);
    }

    public function test_vendor_registration_can_name_the_store(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Bisi', 'email' => 'bisi@atelier.test', 'role' => 'vendor', 'store_name' => 'Bisi Beads',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertCreated()->assertJsonPath('data.user.store.name', 'Bisi Beads')
            ->assertJsonPath('data.user.store.status', 'pending');
    }

    public function test_reset_link_expires_after_an_hour_and_signs_out_everywhere(): void
    {
        Mail::fake();
        $user = $this->makeUser(['email' => 'reset@atelier.test']);
        $old = $user->createToken();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'reset@atelier.test'])->assertOk();
        $plain = null;
        Mail::assertSent(PasswordResetMail::class, function ($mail) use (&$plain) {
            $plain = $mail->token;

            return true;
        });

        $this->travel(61)->minutes();
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'reset@atelier.test', 'token' => $plain,
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertStatus(422)->assertJsonValidationErrors('token');

        $this->travelBack();
        DB::table('password_reset_tokens')->update(['created_at' => now()]);
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'reset@atelier.test', 'token' => $plain,
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertOk();

        $this->withHeaders($this->bearer($old))->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', ['email' => 'reset@atelier.test', 'password' => 'newpass123'])->assertOk();
    }

    public function test_change_password_requires_current_and_revokes_other_devices(): void
    {
        $user = $this->makeUser(['password' => 'secret123']);
        $current = $user->createToken('laptop');
        $other = $user->createToken('phone');

        $this->withHeaders($this->bearer($current))->putJson('/api/v1/auth/password', [
            'current_password' => 'wrong', 'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->withHeaders($this->bearer($current))->putJson('/api/v1/auth/password', [
            'current_password' => 'secret123', 'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertOk();

        $this->withHeaders($this->bearer($current))->getJson('/api/v1/auth/me')->assertOk();
        $this->withHeaders($this->bearer($other))->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_customer_can_close_account_and_orders_are_kept_anonymised(): void
    {
        $user = $this->makeUser(['email' => 'bye@atelier.test', 'password' => 'secret123', 'phone' => '0803']);
        $this->paidSubOrder($user, $this->makeProduct());
        $token = $user->createToken();

        $this->withHeaders($this->bearer($token))->deleteJson('/api/v1/auth/account', ['password' => 'nope'])->assertStatus(422);
        $this->withHeaders($this->bearer($token))->deleteJson('/api/v1/auth/account', ['password' => 'secret123'])->assertOk();

        $fresh = User::find($user->id);
        $this->assertSame('deleted', $fresh->status);
        $this->assertNull($fresh->phone);
        $this->assertNotSame('bye@atelier.test', $fresh->email);
        $this->assertSame(1, Order::where('user_id', $user->id)->count());
        $this->assertSame(0, PersonalAccessToken::count());
        $this->postJson('/api/v1/auth/login', ['email' => 'bye@atelier.test', 'password' => 'secret123'])->assertStatus(422);
    }

    public function test_sellers_cannot_self_delete(): void
    {
        [$vendor] = $this->makeVendor([], ['password' => 'secret123']);

        $this->withHeaders($this->authHeaders($vendor))->deleteJson('/api/v1/auth/account', ['password' => 'secret123'])
            ->assertStatus(422);
    }
}
