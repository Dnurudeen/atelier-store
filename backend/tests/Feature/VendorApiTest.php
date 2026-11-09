<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payout;
use App\Models\Product;
use App\Models\SubOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class VendorApiTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_overview_requires_vendor_role_and_store(): void
    {
        $customer = $this->makeUser();
        $this->withHeaders($this->authHeaders($customer))
            ->getJson('/api/v1/vendor/overview')
            ->assertForbidden();

        [$vendor] = $this->makeVendor();
        $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/overview')
            ->assertOk()
            ->assertJsonStructure(['data' => ['store', 'stats' => ['orders', 'sales', 'products', 'earnings']]]);
    }

    public function test_onboarding_creates_or_updates_store_and_demo_subaccount(): void
    {
        config(['services.paystack.secret' => '']);
        $user = $this->makeUser(['role' => 'customer']);

        $response = $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/vendor/onboarding', [
            'name' => 'Clay Collective',
            'bio' => 'Handmade ceramics',
            'location' => 'Abeokuta',
            'shipping_fee' => 3000,
            'bank_name' => 'Access Bank',
            'account_number' => '0123456789',
            'account_name' => 'Clay Collective',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Clay Collective')
            ->assertJsonPath('data.status', 'pending');

        $this->assertNotNull($response->json('data.paystack_subaccount_code'));
        $this->assertStringStartsWith('ACCT_demo_', $response->json('data.paystack_subaccount_code'));
        $this->assertDatabaseHas('users', ['id' => $user->id, 'role' => 'vendor']);
    }

    public function test_vendor_can_create_and_update_products(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $category = $this->makeCategory();

        $create = $this->withHeaders($this->authHeaders($vendor))->postJson('/api/v1/vendor/products', [
            'name' => 'Indigo Pillow',
            'description' => 'Soft cotton',
            'price' => 18000,
            'stock' => 5,
            'category_id' => $category->id,
            'image_url' => 'https://cdn.example.com/pillow.jpg',
        ]);

        $create->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.store_id', $store->id)
            ->assertJsonCount(1, 'data.images');

        $productId = $create->json('data.id');

        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/products/' . $productId, [
                'price' => 20000,
                'status' => 'published',
            ])
            ->assertOk()
            ->assertJsonPath('data.price', '20000.00')
            ->assertJsonPath('data.status', 'pending');

        $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/products')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_vendor_cannot_update_another_stores_product(): void
    {
        [$vendorA] = $this->makeVendor();
        [, $storeB] = $this->makeVendor();
        $foreign = $this->makeProduct($storeB);

        $this->withHeaders($this->authHeaders($vendorA))
            ->putJson('/api/v1/vendor/products/' . $foreign->id, ['price' => 1])
            ->assertNotFound();
    }

    public function test_vendor_orders_earnings_and_settings(): void
    {
        config(['services.paystack.secret' => '']);
        $this->withCommission(10);

        [$vendor, $store] = $this->makeVendor(['shipping_fee' => 1500]);
        $buyer = $this->makeUser();
        $product = $this->makeProduct($store, null, ['price' => 10000]);

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

        $this->postJson('/api/v1/webhooks/paystack', [
            'event' => 'charge.success',
            'data' => ['reference' => $reference],
        ])->assertOk();

        $subOrderId = SubOrder::first()->id;

        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/orders/' . $subOrderId, [
                'status' => 'shipped',
                'tracking_number' => 'DHL-123',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'shipped')
            ->assertJsonPath('data.tracking_number', 'DHL-123');

        $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $earnings = $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/earnings')
            ->assertOk()
            ->json('data');

        $this->assertGreaterThan(0, $earnings['available']);
        $this->assertSame('available', Payout::first()->status);

        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/settings', [
                'shipping_fee' => 4000,
                'bio' => 'Updated bio',
            ])
            ->assertOk()
            ->assertJsonPath('data.shipping_fee', '4000.00')
            ->assertJsonPath('data.bio', 'Updated bio');

        $this->assertSame(1, Order::count());
        $this->assertSame(1, Product::where('store_id', $store->id)->count());
    }
}
