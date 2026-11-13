<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\SubOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class CartAndVoucherTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private array $address = ['full_name' => 'Ada', 'phone' => '08031234567', 'address_line' => '1 Road', 'city' => 'Ikeja', 'state' => 'Lagos'];

    private function coupon(array $overrides = []): Coupon
    {
        return Coupon::create(array_merge([
            'code' => 'save10',
            'type' => 'percent',
            'value' => 10,
            'is_active' => true,
            'per_user_limit' => 1,
        ], $overrides));
    }

    public function test_quote_reprices_and_flags_stock_and_availability_issues(): void
    {
        [, $store] = $this->makeVendor(['shipping_fee' => 1500]);
        $ok = $this->makeProduct($store, null, ['price' => 10000, 'stock' => 10]);
        $low = $this->makeProduct($store, null, ['price' => 5000, 'stock' => 1]);
        $gone = $this->makeProduct($store, null, ['price' => 1000, 'stock' => 0]);
        $draft = $this->makeProduct($store, null, ['status' => 'draft']);
        $withOptions = $this->makeProduct($store, null, ['stock' => 5]);
        ProductVariant::create(['product_id' => $withOptions->id, 'name' => 'S', 'stock' => 5, 'attributes' => ['size' => 'S']]);

        $res = $this->postJson('/api/v1/cart/quote', ['items' => [
            ['product_id' => $ok->id, 'quantity' => 2],
            ['product_id' => $low->id, 'quantity' => 3],
            ['product_id' => $gone->id, 'quantity' => 1],
            ['product_id' => $draft->id, 'quantity' => 1],
            ['product_id' => $withOptions->id, 'quantity' => 1],
            ['product_id' => 999999, 'quantity' => 1],
        ]])->assertOk();

        $issues = collect($res->json('data.lines'))->pluck('issue')->all();
        $this->assertSame([null, 'limited_stock', 'out_of_stock', 'unavailable', 'choose_option', 'unavailable'], $issues);
        $this->assertSame(1, $res->json('data.lines.1.quantity'));
        $this->assertEquals(25000, $res->json('data.subtotal'));
        $this->assertEquals(1500, $res->json('data.shipping_total'));
        $this->assertEquals(26500, $res->json('data.total'));
        $this->assertTrue($res->json('data.has_issues'));
    }

    public function test_quote_applies_percent_voucher_with_cap_and_reports_errors(): void
    {
        $product = $this->makeProduct(null, null, ['price' => 100000]);
        $this->coupon(['code' => 'BIG', 'value' => 20, 'max_discount' => 5000]);
        $this->coupon(['code' => 'MIN', 'type' => 'fixed', 'value' => 2000, 'min_order' => 500000]);
        $this->coupon(['code' => 'OLD', 'ends_at' => now()->subDay()]);

        $items = [['product_id' => $product->id, 'quantity' => 1]];

        $this->postJson('/api/v1/cart/quote', ['items' => $items, 'coupon_code' => 'big'])
            ->assertJsonPath('data.voucher.code', 'BIG')
            ->assertJsonPath('data.discount_total', 5000);

        $this->postJson('/api/v1/cart/quote', ['items' => $items, 'coupon_code' => 'MIN'])
            ->assertJsonPath('data.voucher', null)
            ->assertJsonPath('data.discount_total', 0);
        $this->assertStringContainsString('Spend at least', $this->postJson('/api/v1/cart/quote', ['items' => $items, 'coupon_code' => 'MIN'])->json('data.voucher_error'));
        $this->assertSame('This voucher has expired.', $this->postJson('/api/v1/cart/quote', ['items' => $items, 'coupon_code' => 'OLD'])->json('data.voucher_error'));
        $this->assertSame('This voucher code is not valid.', $this->postJson('/api/v1/cart/quote', ['items' => $items, 'coupon_code' => 'NOPE'])->json('data.voucher_error'));
    }

    public function test_store_and_category_scoped_vouchers_only_discount_eligible_items(): void
    {
        [, $storeA] = $this->makeVendor(['shipping_fee' => 1000]);
        [, $storeB] = $this->makeVendor(['shipping_fee' => 2000]);
        $a = $this->makeProduct($storeA, null, ['price' => 10000]);
        $b = $this->makeProduct($storeB, null, ['price' => 20000]);
        $this->coupon(['code' => 'ONLYA', 'type' => 'fixed', 'value' => 50000, 'store_id' => $storeA->id]);
        $this->coupon(['code' => 'SHIPA', 'type' => 'free_shipping', 'value' => 0, 'store_id' => $storeA->id]);

        $items = [['product_id' => $a->id, 'quantity' => 1], ['product_id' => $b->id, 'quantity' => 1]];
        $this->postJson('/api/v1/cart/quote', ['items' => $items, 'coupon_code' => 'ONLYA'])->assertJsonPath('data.discount_total', 10000);
        $this->postJson('/api/v1/cart/quote', ['items' => $items, 'coupon_code' => 'SHIPA'])
            ->assertJsonPath('data.discount_total', 1000)
            ->assertJsonPath('data.voucher.free_shipping', true);
    }

    public function test_checkout_with_voucher_reserves_then_redeems_and_keeps_seller_earnings(): void
    {
        $this->withCommission(10);
        [, $store] = $this->makeVendor(['shipping_fee' => 0]);
        $product = $this->makeProduct($store, null, ['price' => 50000]);
        $coupon = $this->coupon(['code' => 'TENOFF', 'value' => 10]);
        $buyer = $this->makeUser();

        $ref = $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => $this->address,
            'coupon_code' => 'tenoff',
        ])->assertOk()->json('data.reference');

        $order = Order::first();
        $this->assertEquals(5000, $order->discount_total);
        $this->assertEquals(45000, $order->total);
        $this->assertSame('TENOFF', $order->coupon_code);
        $sub = SubOrder::first();
        $this->assertEquals(5000, $sub->discount);
        $this->assertEquals(45000, $sub->vendor_earning); // 50k - 10% commission, voucher not charged to seller
        $this->assertSame('reserved', CouponRedemption::first()->status);

        // Same user cannot reuse while reserved.
        $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => $this->address,
            'coupon_code' => 'TENOFF',
        ])->assertStatus(422)->assertJsonValidationErrors('coupon_code');

        $this->postJson('/api/v1/webhooks/paystack', ['event' => 'charge.success', 'data' => ['reference' => $ref]])->assertOk();
        $this->assertSame('redeemed', CouponRedemption::first()->status);
        $this->assertSame(1, $coupon->fresh()->used_count);
    }

    public function test_expired_checkout_releases_the_voucher(): void
    {
        $product = $this->makeProduct();
        $this->coupon(['code' => 'ONCE', 'usage_limit' => 1]);
        $buyer = $this->makeUser();

        $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => $this->address,
            'coupon_code' => 'ONCE',
        ])->assertOk();

        // Fully reserved: another shopper is refused.
        $this->postJson('/api/v1/cart/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'coupon_code' => 'ONCE'])
            ->assertJsonPath('data.voucher_error', 'This voucher has been fully redeemed.');

        $this->travel(31)->minutes();
        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertSame('released', CouponRedemption::first()->status);
        $this->postJson('/api/v1/cart/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'coupon_code' => 'ONCE'])
            ->assertJsonPath('data.voucher.code', 'ONCE');
    }

    public function test_first_order_vouchers(): void
    {
        $product = $this->makeProduct();
        $this->coupon(['code' => 'WELCOME', 'first_order_only' => true]);
        $returning = $this->makeUser();
        $this->paidSubOrder($returning, $product);

        $this->postJson('/api/v1/cart/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'coupon_code' => 'WELCOME'])
            ->assertJsonPath('data.voucher_error', 'Sign in to use this voucher.');

        $this->withHeaders($this->authHeaders($returning))
            ->postJson('/api/v1/cart/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'coupon_code' => 'WELCOME'])
            ->assertJsonPath('data.voucher_error', 'This voucher is for your first order only.');

        $this->withHeaders($this->authHeaders($this->makeUser()))
            ->postJson('/api/v1/cart/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'coupon_code' => 'WELCOME'])
            ->assertJsonPath('data.voucher.code', 'WELCOME');
    }

    public function test_checkout_can_use_a_saved_address_but_not_someone_elses(): void
    {
        $product = $this->makeProduct();
        $buyer = $this->makeUser();
        $mine = $buyer->addresses()->create(['full_name' => 'Ada', 'phone' => '0803', 'address_line' => 'Mine', 'city' => 'Ikeja', 'state' => 'Lagos', 'country' => 'Nigeria']);
        $theirs = $this->makeUser()->addresses()->create(['full_name' => 'Bo', 'phone' => '0803', 'address_line' => 'Theirs', 'city' => 'Ikeja', 'state' => 'Lagos', 'country' => 'Nigeria']);

        $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]], 'address_id' => $theirs->id,
        ])->assertNotFound();

        $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]], 'address_id' => $mine->id,
        ])->assertOk();

        $order = Order::first();
        $this->assertSame($mine->id, $order->address_id);
        $this->assertSame('Mine', $order->shipping_snapshot['address_line']);
    }
}
