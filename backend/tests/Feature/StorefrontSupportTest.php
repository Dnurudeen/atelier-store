<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class StorefrontSupportTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_customers_can_follow_and_unfollow_approved_stores(): void
    {
        [, $store] = $this->makeVendor();
        [, $pending] = $this->makeVendor(['status' => 'pending']);
        $user = $this->makeUser();
        $headers = $this->authHeaders($user);

        $this->withHeaders($headers)->postJson('/api/v1/account/follows', ['store_id' => $store->id])
            ->assertOk()->assertJsonPath('data.following', true)->assertJsonPath('data.followers_count', 1);
        $this->withHeaders($headers)->getJson('/api/v1/account/follows')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/stores/' . $store->slug)->assertJsonPath('data.followers_count', 1);

        $this->withHeaders($headers)->postJson('/api/v1/account/follows', ['store_id' => $store->id])
            ->assertOk()->assertJsonPath('data.following', false);
        $this->withHeaders($headers)->postJson('/api/v1/account/follows', ['store_id' => $pending->id])->assertNotFound();

        $this->flushHeaders();
        $this->postJson('/api/v1/account/follows', ['store_id' => $store->id])->assertUnauthorized();
    }

    public function test_newsletter_signup_is_idempotent_and_validated(): void
    {
        $this->postJson('/api/v1/newsletter', ['email' => 'Fan@Example.com'])->assertOk();
        $this->postJson('/api/v1/newsletter', ['email' => 'fan@example.com'])->assertOk();
        $this->postJson('/api/v1/newsletter', ['email' => 'nope'])->assertStatus(422);

        $this->assertSame(1, DB::table('newsletter_subscribers')->count());
    }

    public function test_contact_form_creates_a_ticket(): void
    {
        $this->postJson('/api/v1/contact', [
            'name' => 'Ada',
            'email' => 'ada@example.com',
            'topic' => 'order',
            'order_number' => 'ATL-1',
            'message' => 'Where is my parcel please?',
        ])->assertCreated()->assertJsonStructure(['data' => ['ticket']]);

        $this->postJson('/api/v1/contact', ['name' => 'Ada', 'email' => 'ada@example.com', 'topic' => 'hack', 'message' => 'short'])
            ->assertStatus(422)->assertJsonValidationErrors(['topic', 'message']);

        $this->assertDatabaseHas('contact_messages', ['email' => 'ada@example.com', 'status' => 'open']);
    }

    public function test_expired_sales_stop_showing_the_old_price(): void
    {
        $live = $this->makeProduct(null, null, ['price' => 800, 'compare_at_price' => 1000, 'sale_ends_at' => now()->addDay()]);
        $ended = $this->makeProduct(null, null, ['price' => 800, 'compare_at_price' => 1000, 'sale_ends_at' => now()->subMinute()]);

        $this->getJson('/api/v1/products/' . $live->slug)->assertJsonPath('data.compare_at_price', '1000.00');
        $this->getJson('/api/v1/products/' . $ended->slug)->assertJsonPath('data.compare_at_price', null);
    }

    public function test_flash_sales_countdown_falls_back_when_deals_have_no_timer(): void
    {
        $this->makeProduct(null, null, ['price' => 800, 'compare_at_price' => 1000, 'sale_ends_at' => null]);

        $this->getJson('/api/v1/home-feed')
            ->assertOk()
            ->assertJsonPath('data.flash_ends_at', fn($v) => $v !== null)
            ->assertJsonCount(1, 'data.flash');
    }

    public function test_flash_sales_countdown_uses_the_soonest_sale_end(): void
    {
        $soon = now()->addHours(6);
        $this->makeProduct(null, null, ['price' => 800, 'compare_at_price' => 1000, 'sale_ends_at' => $soon]);
        $this->makeProduct(null, null, ['price' => 700, 'compare_at_price' => 900, 'sale_ends_at' => now()->addDays(2)]);

        $ends = $this->getJson('/api/v1/home-feed')->assertOk()->json('data.flash_ends_at');
        $this->assertNotNull($ends);
        $this->assertEqualsWithDelta($soon->timestamp, \Carbon\Carbon::parse($ends)->timestamp, 2);
    }
}
