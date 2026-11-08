<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Payout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class CheckoutApiTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_checkout_requires_authentication(): void
    {
        $this->postJson('/api/v1/checkout', [])->assertUnauthorized();
    }

    public function test_checkout_creates_order_payment_and_demo_authorization(): void
    {
        config(['services.paystack.secret' => '']);
        $this->withCommission(10);

        $buyer = $this->makeUser(['email' => 'buyer@atelier.test']);
        [, $store] = $this->makeVendor(['shipping_fee' => 2500, 'paystack_subaccount_code' => 'ACCT_demo_abc']);
        $product = $this->makeProduct($store, null, ['price' => 50000, 'name' => 'Canvas']);

        $response = $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
            'shipping_address' => [
                'full_name' => 'Ada Buyer',
                'phone' => '08012345678',
                'address_line' => '12 Admiralty Way',
                'city' => 'Lagos',
                'state' => 'Lagos',
                'country' => 'Nigeria',
            ],
            'callback_url' => 'http://localhost:3000/checkout/success',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.demo', true)
            ->assertJsonStructure(['data' => ['order', 'payment', 'authorization_url', 'reference']]);

        $order = Order::first();
        $this->assertNotNull($order);
        $this->assertSame(100000.0, (float) $order->subtotal);
        $this->assertSame(2500.0, (float) $order->shipping_total);
        $this->assertSame(102500.0, (float) $order->total);
        $this->assertCount(1, $order->subOrders);
        $this->assertSame(10000.0, (float) $order->subOrders->first()->commission);
        // vendor_earning = (subtotal + shipping) - commission
        $this->assertSame(92500.0, (float) $order->subOrders->first()->vendor_earning);
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseCount('payouts', 1);
    }

    public function test_checkout_rejects_unpublished_product(): void
    {
        $buyer = $this->makeUser();
        $product = $this->makeProduct(null, null, ['status' => 'draft']);

        $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => [
                'full_name' => 'Ada',
                'phone' => '0801',
                'address_line' => 'Street',
                'city' => 'Lagos',
                'state' => 'Lagos',
            ],
        ])->assertStatus(422);
    }

    public function test_webhook_and_verify_mark_order_paid(): void
    {
        config(['services.paystack.secret' => '']);
        $this->withCommission(10);

        $buyer = $this->makeUser();
        $product = $this->makeProduct(null, null, ['price' => 20000]);

        $checkout = $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => [
                'full_name' => 'Ada',
                'phone' => '0801',
                'address_line' => 'Street',
                'city' => 'Lagos',
                'state' => 'Lagos',
            ],
        ])->json('data');

        $reference = $checkout['reference'];

        $this->postJson('/api/v1/webhooks/paystack', [
            'event' => 'charge.success',
            'data' => ['reference' => $reference],
        ])->assertOk()->assertJsonPath('message', 'ok');

        $order = Order::where('paystack_reference', $reference)->first();
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('processing', $order->status);
        $this->assertSame('paid', $order->subOrders->first()->status);
        $this->assertSame('success', Payment::where('reference', $reference)->value('status'));
        $this->assertSame('available', Payout::first()->status);

        // Idempotent second webhook
        $this->postJson('/api/v1/webhooks/paystack', [
            'event' => 'charge.success',
            'data' => ['reference' => $reference],
        ])->assertOk();

        $this->assertSame(1, Payment::where('reference', $reference)->where('status', 'success')->count());
    }

    public function test_verify_endpoint_marks_paid_in_demo_mode(): void
    {
        config(['services.paystack.secret' => '']);

        $buyer = $this->makeUser();
        $product = $this->makeProduct(null, null, ['price' => 15000]);

        $reference = $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => [
                'full_name' => 'Ada',
                'phone' => '0801',
                'address_line' => 'Street',
                'city' => 'Lagos',
                'state' => 'Lagos',
            ],
        ])->json('data.reference');

        $this->withHeaders($this->authHeaders($buyer))
            ->getJson('/api/v1/payments/verify/' . $reference)
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'paid');
    }

    public function test_multi_vendor_checkout_splits_suborders_and_shipping(): void
    {
        config(['services.paystack.secret' => '']);
        $this->withCommission(10);

        $buyer = $this->makeUser();
        [, $storeA] = $this->makeVendor(['shipping_fee' => 2000]);
        [, $storeB] = $this->makeVendor(['shipping_fee' => 3000]);
        $productA = $this->makeProduct($storeA, null, ['price' => 10000]);
        $productB = $this->makeProduct($storeB, null, ['price' => 20000]);

        $response = $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [
                ['product_id' => $productA->id, 'quantity' => 1],
                ['product_id' => $productB->id, 'quantity' => 1],
            ],
            'shipping_address' => [
                'full_name' => 'Ada',
                'phone' => '0801',
                'address_line' => 'Street',
                'city' => 'Lagos',
                'state' => 'Lagos',
            ],
        ]);

        $response->assertOk();
        $order = Order::with('subOrders')->first();
        $this->assertCount(2, $order->subOrders);
        $this->assertSame(30000.0, (float) $order->subtotal);
        $this->assertSame(5000.0, (float) $order->shipping_total);
        $this->assertSame(35000.0, (float) $order->total);
    }
}
