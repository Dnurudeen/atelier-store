<?php

namespace Tests\Feature;

use App\Models\InboxNotification;
use App\Models\Review;
use App\Models\SubOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class SellerCenterTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_overview_has_series_top_products_low_stock_and_todo(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $product = $this->makeProduct($store, null, ['price' => 5000, 'stock' => 2]);
        $this->paidSubOrder($this->makeUser(), $product);
        $old = $this->paidSubOrder($this->makeUser(), $product);
        SubOrder::where('id', $old->id)->update(['created_at' => now()->subDays(3)]);

        $res = $this->withHeaders($this->authHeaders($vendor))->getJson('/api/v1/vendor/overview')->assertOk();

        $this->assertCount(30, $res->json('data.series'));
        $this->assertEquals(5000, collect($res->json('data.series'))->last()['sales']);
        $this->assertSame(2, $res->json('data.todo.to_process'));
        $this->assertSame(1, $res->json('data.todo.late'));
        $this->assertSame($product->id, $res->json('data.low_stock.0.id'));
        $this->assertSame($product->id, $res->json('data.top_products.0.product_id'));
    }

    public function test_orders_hide_unpaid_checkouts_and_support_tabs_and_detail(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $product = $this->makeProduct($store);
        $paid = $this->paidSubOrder($this->makeUser(), $product);
        $unpaid = $this->paidSubOrder($this->makeUser(), $product, ['status' => 'pending']);
        $unpaid->order->update(['payment_status' => 'pending']);
        $headers = $this->authHeaders($vendor);

        $this->withHeaders($headers)->getJson('/api/v1/vendor/orders')->assertJsonCount(1, 'data')->assertJsonPath('meta.counts.new', 1);
        $this->withHeaders($headers)->getJson('/api/v1/vendor/orders?status=shipped')->assertJsonCount(0, 'data');
        $this->withHeaders($headers)->getJson('/api/v1/vendor/orders/'.$paid->id)->assertOk()->assertJsonPath('data.order.user.name', 'Test User');
        $this->withHeaders($headers)->getJson('/api/v1/vendor/orders/'.$unpaid->id)->assertNotFound();

        $foreign = $this->paidSubOrder($this->makeUser(), $this->makeProduct());
        $this->withHeaders($headers)->getJson('/api/v1/vendor/orders/'.$foreign->id)->assertNotFound();
    }

    public function test_sellers_reply_to_reviews_and_customers_are_notified(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $product = $this->makeProduct($store);
        $buyer = $this->makeUser();
        $review = Review::create(['user_id' => $buyer->id, 'product_id' => $product->id, 'rating' => 3, 'comment' => 'OK']);
        $other = Review::create(['user_id' => $this->makeUser()->id, 'product_id' => $this->makeProduct()->id, 'rating' => 5]);
        $headers = $this->authHeaders($vendor);

        $this->withHeaders($headers)->getJson('/api/v1/vendor/reviews?filter=unanswered')->assertJsonCount(1, 'data');
        $this->withHeaders($headers)->putJson("/api/v1/vendor/reviews/{$review->id}/reply", ['reply' => 'Thanks for the feedback!'])
            ->assertOk()->assertJsonPath('data.vendor_reply', 'Thanks for the feedback!');
        $this->withHeaders($headers)->putJson("/api/v1/vendor/reviews/{$other->id}/reply", ['reply' => 'Nope'])->assertNotFound();
        $this->withHeaders($headers)->getJson('/api/v1/vendor/reviews?filter=unanswered')->assertJsonCount(0, 'data');

        $this->assertTrue(InboxNotification::where('user_id', $buyer->id)->where('type', 'review')->exists());
    }

    public function test_product_csv_export_contains_only_own_products(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $this->makeProduct($store, null, ['name' => 'Mine', 'sku' => 'SKU-1']);
        $this->makeProduct(null, null, ['name' => 'Theirs']);

        $res = $this->withHeaders($this->authHeaders($vendor))->get('/api/v1/vendor/products/export')->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
        $body = $res->getContent();
        $this->assertStringContainsString('SKU-1', $body);
        $this->assertStringNotContainsString('Theirs', $body);
    }

    public function test_paid_orders_raise_sold_count_and_cancellations_lower_it(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $product = $this->makeProduct($store, null, ['stock' => 5, 'sold_count' => 0]);
        $buyer = $this->makeUser();

        $ref = $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'shipping_address' => ['full_name' => 'A', 'phone' => '08031234567', 'address_line' => '1 Road', 'city' => 'Ikeja', 'state' => 'Lagos'],
        ])->json('data.reference');
        $this->postJson('/api/v1/webhooks/paystack', ['event' => 'charge.success', 'data' => ['reference' => $ref]]);
        $this->assertSame(2, $product->fresh()->sold_count);

        $sub = SubOrder::first();
        $this->withHeaders($this->authHeaders($vendor))->putJson('/api/v1/vendor/orders/'.$sub->id, ['status' => 'cancelled', 'reason' => 'No stock'])->assertOk();
        $this->assertSame(0, $product->fresh()->sold_count);
        $this->assertTrue(InboxNotification::where('user_id', $buyer->id)->where('title', 'Package cancelled')->exists());
    }
}
