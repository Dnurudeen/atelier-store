<?php

namespace Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_role_helpers(): void
    {
        $customer = $this->makeUser(['role' => 'customer']);
        $vendor = $this->makeUser(['role' => 'vendor']);
        $admin = $this->makeAdmin();

        $this->assertFalse($customer->isAdmin());
        $this->assertFalse($customer->isVendor());
        $this->assertTrue($vendor->isVendor());
        $this->assertTrue($admin->isAdmin());
    }

    public function test_vendor_has_store_relation(): void
    {
        [$user, $store] = $this->makeVendor();

        $this->assertTrue($user->store()->exists());
        $this->assertSame($store->id, $user->fresh('store')->store->id);
    }
}
