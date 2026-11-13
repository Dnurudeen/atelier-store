<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AccountApiTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_profile_get_and_update(): void
    {
        $user = $this->makeUser(['name' => 'Old Name']);

        $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/v1/account/profile')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);

        $this->withHeaders($this->authHeaders($user))
            ->putJson('/api/v1/account/profile', [
                'name' => 'New Name',
                'phone' => '08099990000',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.phone', '08099990000');
    }

    public function test_addresses_can_be_listed_and_created_with_default_flag(): void
    {
        $user = $this->makeUser();

        $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/addresses', [
            'label' => 'Home',
            'full_name' => 'Ada',
            'phone' => '0801 234 5678',
            'address_line' => '12 Road',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'is_default' => true,
        ])->assertCreated()->assertJsonPath('data.is_default', true);

        $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/addresses', [
            'full_name' => 'Ada',
            'phone' => '0801 234 5678',
            'address_line' => 'Office',
            'city' => 'Abuja',
            'state' => 'FCT',
            'is_default' => true,
        ])->assertCreated();

        $list = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/v1/account/addresses')
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $list);
        $this->assertSame(1, collect($list)->where('is_default', true)->count());
    }

    public function test_wishlist_toggle_and_list(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct();

        $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/v1/account/wishlist', ['product_id' => $product->id])
            ->assertOk()
            ->assertJsonPath('data.wishlisted', true);

        $this->assertDatabaseHas('wishlists', [
            'user_id' => $user->id,
            'product_id' => $product->id,
        ]);

        $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/v1/account/wishlist')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/v1/account/wishlist', ['product_id' => $product->id])
            ->assertOk()
            ->assertJsonPath('data.wishlisted', false);

        $this->assertSame(0, Wishlist::count());
    }

    public function test_review_requires_a_delivered_purchase(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(null, null, ['rating' => 0, 'reviews_count' => 0]);

        $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/reviews', [
            'product_id' => $product->id,
            'rating' => 5,
        ])->assertStatus(422);

        $this->assertSame(0, $product->fresh()->reviews_count);
    }

    public function test_review_updates_product_rating(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(null, null, ['rating' => 0, 'reviews_count' => 0]);
        $this->paidSubOrder($user, $product, [
            'status' => 'delivered',
            'delivered_at' => now(),
            'shipped_at' => now(),
        ]);

        $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/reviews', [
            'product_id' => $product->id,
            'rating' => 5,
            'comment' => 'Beautiful work',
        ])->assertCreated();

        $product->refresh();
        $this->assertSame(5.0, (float) $product->rating);
        $this->assertSame(1, $product->reviews_count);

        $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/reviews', [
            'product_id' => $product->id,
            'rating' => 3,
        ])->assertCreated();

        $product->refresh();
        $this->assertSame(3.0, (float) $product->rating);
        $this->assertSame(1, $product->reviews_count);
    }

    public function test_orders_list_and_detail_are_scoped_to_user(): void
    {
        config(['services.paystack.secret' => '']);
        $buyer = $this->makeUser();
        $other = $this->makeUser();
        $product = $this->makeProduct(null, null, ['price' => 12000]);

        $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => [
                'full_name' => 'Ada',
                'phone' => '0801',
                'address_line' => 'Street',
                'city' => 'Lagos',
                'state' => 'Lagos',
            ],
        ])->assertOk();

        $orderId = Order::first()->id;

        $this->withHeaders($this->authHeaders($buyer))
            ->getJson('/api/v1/account/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withHeaders($this->authHeaders($buyer))
            ->getJson('/api/v1/account/orders/'.$orderId)
            ->assertOk()
            ->assertJsonPath('data.id', $orderId);

        $this->withHeaders($this->authHeaders($other))
            ->getJson('/api/v1/account/orders/'.$orderId)
            ->assertNotFound();
    }
}
