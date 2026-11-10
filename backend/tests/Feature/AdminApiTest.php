<?php

namespace Tests\Feature;

use App\Mail\VendorStatusMail;
use App\Models\Payout;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_overview_and_vendor_approval_flow(): void
    {
        Mail::fake();

        $admin = $this->makeAdmin();
        [, $pending] = $this->makeVendor(['status' => 'pending']);
        $this->makeUser(['role' => 'customer']);
        $this->makeProduct($pending, null, ['status' => 'pending']);

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/overview')
            ->assertOk()
            ->assertJsonPath('data.pending_vendors', 1)
            ->assertJsonPath('data.pending_products', 1)
            ->assertJsonPath('data.customers', 1);

        $this->withHeaders($this->authHeaders($admin))
            ->putJson('/api/v1/admin/vendors/' . $pending->id, ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        Mail::assertSent(VendorStatusMail::class);

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/vendors')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_can_moderate_products_and_manage_categories_banners(): void
    {
        $admin = $this->makeAdmin();
        $product = $this->makeProduct(null, null, ['status' => 'pending', 'is_featured' => false]);

        $this->withHeaders($this->authHeaders($admin))
            ->putJson('/api/v1/admin/products/' . $product->id, [
                'status' => 'published',
                'is_featured' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.is_featured', true);

        $this->withHeaders($this->authHeaders($admin))
            ->postJson('/api/v1/admin/categories', [
                'name' => 'Home Decor',
                'description' => 'For living spaces',
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'home-decor');

        $banner = $this->withHeaders($this->authHeaders($admin))
            ->postJson('/api/v1/admin/banners', [
                'title' => 'Holiday Drop',
                'subtitle' => 'Limited edition',
                'image' => '/media/hero/hero-1.jpg',
                'cta_label' => 'Shop',
                'cta_url' => '/shop',
            ])
            ->assertCreated()
            ->json('data');

        $this->withHeaders($this->authHeaders($admin))
            ->putJson('/api/v1/admin/banners/' . $banner['id'], ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/categories')
            ->assertOk();

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/banners')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/products')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_settings_and_payout_update(): void
    {
        config(['services.paystack.secret' => '']);
        $admin = $this->makeAdmin();
        $this->withCommission(10);

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/settings')
            ->assertOk()
            ->assertJsonPath('data.commission_rate', 10);

        $this->withHeaders($this->authHeaders($admin))
            ->putJson('/api/v1/admin/settings', ['commission_rate' => 12.5])
            ->assertOk()
            ->assertJsonPath('data.commission_rate', 12.5);

        $this->assertSame('12.5', Setting::getValue('commission_rate'));

        $buyer = $this->makeUser();
        [, $store] = $this->makeVendor(['shipping_fee' => 0]);
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

        $subOrder = \App\Models\SubOrder::first();
        $subOrder->update([
            'status' => 'delivered',
            'shipped_at' => now(),
            'delivered_at' => now(),
        ]);

        $this->withHeaders($this->authHeaders($admin))
            ->postJson('/api/v1/admin/statements/close')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $payout = Payout::first();
        $this->assertNotNull($payout);

        $this->withHeaders($this->authHeaders($admin))
            ->putJson('/api/v1/admin/payouts/' . $payout->id, [
                'status' => 'paid',
                'reference' => 'PAY-001',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/payouts')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withHeaders($this->authHeaders($admin))
            ->getJson('/api/v1/admin/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/admin/overview')->assertUnauthorized();
    }

    public function test_customer_cannot_access_admin_endpoints(): void
    {
        $customer = $this->makeUser(['role' => 'customer']);
        [, $pending] = $this->makeVendor(['status' => 'pending']);

        $this->withHeaders($this->authHeaders($customer))
            ->getJson('/api/v1/admin/overview')
            ->assertForbidden();

        $this->withHeaders($this->authHeaders($customer))
            ->putJson('/api/v1/admin/vendors/' . $pending->id, ['status' => 'approved'])
            ->assertForbidden();

        $this->assertDatabaseHas('stores', [
            'id' => $pending->id,
            'status' => 'pending',
        ]);
    }
}
