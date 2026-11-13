<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Statement;
use App\Models\SubOrder;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function address(): array
    {
        return [
            'full_name' => 'Ada Buyer',
            'phone' => '08012345678',
            'address_line' => '12 Admiralty Way',
            'city' => 'Lekki',
            'state' => 'Lagos',
        ];
    }

    private function checkout($buyer, array $items, array $extra = [])
    {
        return $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', array_merge([
            'items' => $items,
            'shipping_address' => $this->address(),
        ], $extra));
    }

    // --- C1: private store fields -------------------------------------------------

    public function test_public_endpoints_never_expose_vendor_bank_details(): void
    {
        [, $store] = $this->makeVendor([
            'bank_name' => 'Access Bank',
            'account_number' => '0123456789',
            'account_name' => 'Secret Studio',
            'paystack_subaccount_code' => 'ACCT_secret',
        ]);
        $product = $this->makeProduct($store);

        foreach (['/api/v1/stores', '/api/v1/stores/'.$store->slug, '/api/v1/home-feed', '/api/v1/products', '/api/v1/products/'.$product->slug, '/api/v1/search?q=Lagos'] as $url) {
            $body = $this->getJson($url)->assertOk()->getContent();
            $this->assertStringNotContainsString('0123456789', $body, $url);
            $this->assertStringNotContainsString('ACCT_secret', $body, $url);
            $this->assertStringNotContainsString('account_name', $body, $url);
        }
    }

    public function test_store_owner_still_sees_their_masked_bank_details(): void
    {
        [$vendor] = $this->makeVendor(['account_number' => '0123456789', 'bank_name' => 'Access Bank']);

        $this->withHeaders($this->authHeaders($vendor))->getJson('/api/v1/vendor/overview')
            ->assertOk()
            ->assertJsonPath('data.store.bank_name', 'Access Bank')
            ->assertJsonPath('data.store.account_number_masked', '******6789');
    }

    // --- C2: order lifecycle ---------------------------------------------------------

    public function test_vendor_cannot_mark_an_unpaid_order_delivered(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $buyer = $this->makeUser();
        $product = $this->makeProduct($store, null, ['price' => 10000]);

        $this->checkout($buyer, [['product_id' => $product->id, 'quantity' => 1]])->assertOk();
        $subOrder = SubOrder::first();

        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/orders/'.$subOrder->id, ['status' => 'delivered'])
            ->assertStatus(422);

        $this->assertSame('pending', $subOrder->fresh()->status);
        $this->assertSame(0.0, app(\App\Services\StatementService::class)->pending($store));
    }

    public function test_unpaid_delivered_orders_never_reach_statements(): void
    {
        [, $store] = $this->makeVendor();
        $buyer = $this->makeUser();
        $product = $this->makeProduct($store, null, ['price' => 10000]);
        $sub = $this->paidSubOrder($buyer, $product, ['status' => 'delivered']);
        $sub->order->update(['payment_status' => 'pending']);

        $this->assertSame(0.0, app(\App\Services\StatementService::class)->pending($store));
    }

    public function test_orders_cannot_move_backwards_and_tracking_is_kept(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $product = $this->makeProduct($store);
        $sub = $this->paidSubOrder($this->makeUser(), $product);
        $headers = $this->authHeaders($vendor);

        $this->withHeaders($headers)->putJson('/api/v1/vendor/orders/'.$sub->id, ['status' => 'shipped', 'tracking_number' => 'GIG-1'])
            ->assertOk()->assertJsonPath('data.status', 'shipped');
        $this->withHeaders($headers)->putJson('/api/v1/vendor/orders/'.$sub->id, ['status' => 'processing'])
            ->assertStatus(422);
        $this->withHeaders($headers)->putJson('/api/v1/vendor/orders/'.$sub->id, ['status' => 'cancelled'])
            ->assertStatus(422);
        $this->withHeaders($headers)->putJson('/api/v1/vendor/orders/'.$sub->id, ['status' => 'delivered', 'tracking_number' => null])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.tracking_number', 'GIG-1');

        $this->assertSame('delivered', $sub->order->fresh()->status);
    }

    public function test_cancelling_a_paid_order_restocks_and_flags_refund(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $buyer = $this->makeUser();
        $product = $this->makeProduct($store, null, ['price' => 5000, 'stock' => 5]);

        $reference = $this->checkout($buyer, [['product_id' => $product->id, 'quantity' => 2]])->json('data.reference');
        $this->assertSame(3, $product->fresh()->stock);
        $this->postJson('/api/v1/webhooks/paystack', ['event' => 'charge.success', 'data' => ['reference' => $reference]])->assertOk();

        $sub = SubOrder::first();
        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/orders/'.$sub->id, ['status' => 'cancelled', 'reason' => 'Out of stock'])
            ->assertOk()
            ->assertJsonPath('data.refund_status', 'pending');

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame('cancelled', Order::first()->status);
    }

    public function test_return_after_payout_is_clawed_back_on_next_statement(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $admin = $this->makeAdmin();
        $product = $this->makeProduct($store, null, ['price' => 10000]);
        $first = $this->paidSubOrder($this->makeUser(), $product, ['status' => 'delivered', 'delivered_at' => now()]);

        $this->withHeaders($this->authHeaders($admin))->postJson('/api/v1/admin/statements/close')->assertOk();
        $this->assertNotNull($first->fresh()->statement_id);

        app(OrderService::class)->transition($first->fresh(), 'returned', 'vendor');
        $this->paidSubOrder($this->makeUser(), $product, ['status' => 'delivered', 'subtotal' => 30000, 'total' => 30000, 'vendor_earning' => 30000]);

        $this->assertSame(20000.0, app(\App\Services\StatementService::class)->pending($store));
        $this->withHeaders($this->authHeaders($admin))->postJson('/api/v1/admin/statements/close')->assertOk();

        $latest = Statement::latest('id')->first();
        $this->assertSame(-10000.0, (float) $latest->adjustments);
        $this->assertSame(20000.0, (float) $latest->net);
        $this->assertSame($latest->id, $first->fresh()->clawback_statement_id);
    }

    // --- C3/C4: payments -------------------------------------------------------------

    public function test_verify_does_not_reveal_another_users_order(): void
    {
        $buyer = $this->makeUser();
        $stranger = $this->makeUser();
        $product = $this->makeProduct();
        $reference = $this->checkout($buyer, [['product_id' => $product->id, 'quantity' => 1]])->json('data.reference');

        $this->withHeaders($this->authHeaders($stranger))
            ->getJson('/api/v1/payments/verify/'.$reference)
            ->assertNotFound();

        $this->assertSame('pending', Order::first()->payment_status);
    }

    public function test_live_webhook_with_wrong_amount_does_not_mark_paid(): void
    {
        config(['services.paystack.secret' => 'sk_test_x']);
        $buyer = $this->makeUser();
        $product = $this->makeProduct(null, null, ['price' => 10000]);
        [, $store] = [null, $product->store];

        // Create the order in demo mode, then switch to "live" for the webhook.
        config(['services.paystack.secret' => '']);
        $reference = $this->checkout($buyer, [['product_id' => $product->id, 'quantity' => 1]])->json('data.reference');
        config(['services.paystack.secret' => 'sk_test_x']);

        $total = (int) round((float) Order::first()->total * 100);
        $send = function (int $amount) use ($reference) {
            $body = json_encode(['event' => 'charge.success', 'data' => ['reference' => $reference, 'amount' => $amount, 'currency' => 'NGN']]);

            return $this->call('POST', '/api/v1/webhooks/paystack', [], [], [], [
                'HTTP_X_PAYSTACK_SIGNATURE' => hash_hmac('sha512', $body, 'sk_test_x'),
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
            ], $body);
        };

        $send(100)->assertOk();
        $this->assertSame('pending', Order::first()->payment_status);
        $this->assertSame('amount_mismatch', Payment::first()->failure_reason);

        Payment::first()->update(['status' => 'pending']);
        $send($total)->assertOk();
        $this->assertSame('paid', Order::first()->payment_status);
    }

    public function test_unsigned_webhooks_are_rejected_when_demo_is_off(): void
    {
        config(['services.paystack.secret' => '', 'services.paystack.demo' => false]);

        $this->postJson('/api/v1/webhooks/paystack', ['event' => 'charge.success', 'data' => ['reference' => 'x']])
            ->assertStatus(401);
    }

    public function test_checkout_ignores_foreign_callback_urls(): void
    {
        $buyer = $this->makeUser();
        $product = $this->makeProduct();

        $url = $this->checkout($buyer, [['product_id' => $product->id, 'quantity' => 1]], [
            'callback_url' => 'https://evil.example.com/steal',
        ])->assertOk()->json('data.authorization_url');

        $this->assertStringStartsWith('http://localhost:3000/checkout/success', $url);
    }

    // --- C5: stock ------------------------------------------------------------------

    public function test_duplicate_lines_are_merged_before_the_stock_check(): void
    {
        $buyer = $this->makeUser();
        $product = $this->makeProduct(null, null, ['stock' => 3]);

        $this->checkout($buyer, [
            ['product_id' => $product->id, 'quantity' => 2],
            ['product_id' => $product->id, 'quantity' => 2],
        ])->assertStatus(422);

        $this->assertSame(3, $product->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_stock_is_reserved_at_checkout_and_released_when_unpaid_orders_expire(): void
    {
        $buyer = $this->makeUser();
        $product = $this->makeProduct(null, null, ['stock' => 2]);

        $this->checkout($buyer, [['product_id' => $product->id, 'quantity' => 2]])->assertOk();
        $this->assertSame(0, $product->fresh()->stock);

        // A second shopper cannot buy the reserved units.
        $this->checkout($this->makeUser(), [['product_id' => $product->id, 'quantity' => 1]])->assertStatus(422);

        $this->travel(31)->minutes();
        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertSame(2, $product->fresh()->stock);
        $order = Order::first();
        $this->assertSame('abandoned', $order->payment_status);
        $this->assertSame('expired', $order->status);
        $this->assertSame('abandoned', Payment::first()->status);
    }

    public function test_variant_purchase_requires_and_reserves_the_variant(): void
    {
        $buyer = $this->makeUser();
        $product = $this->makeProduct(null, null, ['stock' => 5]);
        $variant = ProductVariant::create(['product_id' => $product->id, 'name' => 'Red', 'stock' => 1, 'attributes' => ['color' => 'Red']]);

        $this->checkout($buyer, [['product_id' => $product->id, 'quantity' => 1]])->assertStatus(422);
        $this->checkout($buyer, [['product_id' => $product->id, 'variant_id' => $variant->id, 'quantity' => 2]])->assertStatus(422);
        $this->checkout($buyer, [['product_id' => $product->id, 'variant_id' => $variant->id, 'quantity' => 1]])->assertOk();

        $this->assertSame(0, $variant->fresh()->stock);
        $this->assertSame(4, $product->fresh()->stock);
    }

    public function test_quantity_per_line_is_capped(): void
    {
        $product = $this->makeProduct(null, null, ['stock' => 500]);

        $this->checkout($this->makeUser(), [['product_id' => $product->id, 'quantity' => 21]])->assertStatus(422);
    }

    // --- Store status & moderation ------------------------------------------------------

    public function test_pending_store_can_browse_and_edit_settings_but_not_sell(): void
    {
        [$vendor] = $this->makeVendor(['status' => 'pending']);
        $headers = $this->authHeaders($vendor);

        $this->withHeaders($headers)->getJson('/api/v1/vendor/overview')->assertOk();
        $this->withHeaders($headers)->putJson('/api/v1/vendor/settings', ['bio' => 'Hello'])->assertOk();
        // Drafts only: anything submitted is kept as a draft until the store is approved.
        $category = $this->makeCategory();
        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', ['name' => 'Draft piece', 'price' => 1000, 'stock' => 1, 'category_id' => $category->id, 'images' => ['/x.jpg']])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');
        $this->withHeaders($headers)->postJson('/api/v1/vendor/products/inventory', ['items' => [['id' => 1, 'stock' => 3]]])
            ->assertForbidden()
            ->assertJsonPath('code', 'store_pending');
        $this->withHeaders($headers)->postJson('/api/v1/vendor/sponsorships', ['product_id' => 1, 'budget' => 1000])
            ->assertForbidden();
    }

    public function test_suspended_store_cannot_fulfil_orders(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $sub = $this->paidSubOrder($this->makeUser(), $this->makeProduct($store));
        $store->update(['status' => 'suspended']);

        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/orders/'.$sub->id, ['status' => 'shipped'])
            ->assertForbidden()
            ->assertJsonPath('code', 'store_suspended');
    }

    public function test_admin_without_a_store_gets_a_clear_403(): void
    {
        $this->withHeaders($this->authHeaders($this->makeAdmin()))
            ->getJson('/api/v1/vendor/overview')
            ->assertForbidden()
            ->assertJsonPath('code', 'store_missing');
    }

    public function test_editing_a_live_listing_sends_it_back_to_review_but_price_changes_do_not(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $product = $this->makeProduct($store);
        $headers = $this->authHeaders($vendor);

        $this->withHeaders($headers)->putJson('/api/v1/vendor/products/'.$product->id, ['price' => 999, 'stock' => 3])
            ->assertOk()->assertJsonPath('data.status', 'published');

        $this->withHeaders($headers)->putJson('/api/v1/vendor/products/'.$product->id, ['name' => 'Totally different'])
            ->assertOk()->assertJsonPath('data.status', 'pending');
    }

    public function test_changing_bank_details_drops_the_old_split_account(): void
    {
        [$vendor, $store] = $this->makeVendor(['account_number' => '1111111111', 'paystack_subaccount_code' => 'ACCT_old']);

        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/settings', ['account_number' => '2222222222'])
            ->assertOk();

        $this->assertNull($store->fresh()->paystack_subaccount_code);
    }

    public function test_split_settled_orders_are_not_paid_out_twice(): void
    {
        [, $store] = $this->makeVendor();
        $sub = $this->paidSubOrder($this->makeUser(), $this->makeProduct($store), ['status' => 'delivered', 'settled_via_split' => true]);

        $this->assertSame(0.0, app(\App\Services\StatementService::class)->pending($store));
        $this->withHeaders($this->authHeaders($this->makeAdmin()))->postJson('/api/v1/admin/statements/close')->assertOk();
        $this->assertSame(0, Payout::count());
        $this->assertNull($sub->fresh()->statement_id);
    }

    // --- Admin guards ---------------------------------------------------------------------

    public function test_duplicate_category_names_get_unique_slugs(): void
    {
        $headers = $this->authHeaders($this->makeAdmin());
        $a = $this->withHeaders($headers)->postJson('/api/v1/admin/categories', ['name' => 'Home Decor'])->assertCreated()->json('data.slug');
        $b = $this->withHeaders($headers)->postJson('/api/v1/admin/categories', ['name' => 'Home Decor'])->assertCreated()->json('data.slug');

        $this->assertNotSame($a, $b);
    }

    public function test_banner_links_reject_javascript_urls(): void
    {
        $this->withHeaders($this->authHeaders($this->makeAdmin()))
            ->postJson('/api/v1/admin/banners', ['title' => 'X', 'image' => '/media/x.jpg', 'cta_url' => 'javascript:alert(1)'])
            ->assertStatus(422);
    }

    public function test_paid_payouts_cannot_be_changed_and_need_a_reference(): void
    {
        [, $store] = $this->makeVendor();
        $payout = Payout::create(['store_id' => $store->id, 'amount' => 1000, 'commission' => 0, 'status' => 'pending']);
        $headers = $this->authHeaders($this->makeAdmin());

        $this->withHeaders($headers)->putJson('/api/v1/admin/payouts/'.$payout->id, ['status' => 'paid'])->assertStatus(422);
        $this->withHeaders($headers)->putJson('/api/v1/admin/payouts/'.$payout->id, ['status' => 'paid', 'reference' => 'TRF-1'])->assertOk();
        $this->withHeaders($headers)->putJson('/api/v1/admin/payouts/'.$payout->id, ['status' => 'failed'])->assertStatus(422);
    }

    public function test_home_feed_does_not_write_to_the_database(): void
    {
        $this->makeProduct();
        \Illuminate\Support\Facades\DB::enableQueryLog();
        $this->getJson('/api/v1/home-feed')->assertOk();

        $writes = collect(\Illuminate\Support\Facades\DB::getQueryLog())
            ->filter(fn ($q) => preg_match('/^\s*(insert|update|delete)/i', $q['query']));
        $this->assertCount(0, $writes);
    }

    public function test_login_is_rate_limited(): void
    {
        $user = $this->makeUser(['email' => 'limit@atelier.test']);
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'limit@atelier.test', 'password' => 'wrong'])->assertStatus(422);
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'limit@atelier.test', 'password' => 'wrong'])->assertStatus(429);
    }
}
