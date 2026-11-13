<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Coupon;
use App\Models\InboxNotification;
use App\Models\OrderItem;
use App\Models\ReturnRequest;
use App\Models\Review;
use App\Models\Statement;
use App\Services\StatementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class CustomerAccountTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_overview_counts_only_paid_spending(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(null, null, ['price' => 10000]);
        $this->paidSubOrder($user, $product);
        $unpaid = $this->paidSubOrder($user, $product);
        $unpaid->order->update(['payment_status' => 'pending']);

        $this->withHeaders($this->authHeaders($user))->getJson('/api/v1/account/overview')
            ->assertOk()
            ->assertJsonPath('data.total_spent', 10000)
            ->assertJsonPath('data.counts.orders', 2)
            ->assertJsonCount(2, 'data.recent_orders');
    }

    public function test_order_tabs_and_detail_flags(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct();
        $delivered = $this->paidSubOrder($user, $product, ['status' => 'delivered', 'delivered_at' => now()]);
        $delivered->order->syncStatus();
        $ongoing = $this->paidSubOrder($user, $product);
        $ongoing->order->syncStatus();
        $headers = $this->authHeaders($user);

        $this->withHeaders($headers)->getJson('/api/v1/account/orders?status=delivered')->assertJsonCount(1, 'data');
        $this->withHeaders($headers)->getJson('/api/v1/account/orders?status=ongoing')->assertJsonCount(1, 'data');

        $this->withHeaders($headers)->getJson('/api/v1/account/orders/'.$delivered->order_id)
            ->assertOk()
            ->assertJsonPath('data.sub_orders.0.can_cancel', false)
            ->assertJsonPath('data.sub_orders.0.items.0.can_review', true)
            ->assertJsonPath('data.sub_orders.0.items.0.returnable_quantity', 1);

        $this->withHeaders($headers)->getJson('/api/v1/account/orders/'.$ongoing->order_id)
            ->assertJsonPath('data.sub_orders.0.can_cancel', true)
            ->assertJsonPath('data.sub_orders.0.items.0.returnable_quantity', 0);

        $this->withHeaders($this->authHeaders($this->makeUser()))->getJson('/api/v1/account/orders/'.$ongoing->order_id)->assertNotFound();
    }

    public function test_customer_can_cancel_before_shipping_but_not_after(): void
    {
        $user = $this->makeUser();
        [$vendorUser, $store] = $this->makeVendor();
        $product = $this->makeProduct($store, null, ['stock' => 3]);
        $sub = $this->paidSubOrder($user, $product);
        $headers = $this->authHeaders($user);

        $this->withHeaders($headers)->postJson("/api/v1/account/orders/{$sub->order_id}/sub-orders/{$sub->id}/cancel", [])
            ->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->withHeaders($headers)->postJson("/api/v1/account/orders/{$sub->order_id}/sub-orders/{$sub->id}/cancel", ['reason' => 'Changed my mind'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('data.refund_status', 'pending');

        $this->assertSame(4, $product->fresh()->stock);
        $this->assertTrue(InboxNotification::where('user_id', $vendorUser->id)->where('title', 'Order cancelled by customer')->exists());

        $shipped = $this->paidSubOrder($user, $product, ['status' => 'shipped']);
        $this->withHeaders($headers)->postJson("/api/v1/account/orders/{$shipped->order_id}/sub-orders/{$shipped->id}/cancel", ['reason' => 'Too late'])
            ->assertStatus(422);
    }

    public function test_return_flow_with_rejection_escalation_and_partial_clawback(): void
    {
        $user = $this->makeUser();
        [$vendor, $store] = $this->makeVendor();
        $admin = $this->makeAdmin();
        $product = $this->makeProduct($store, null, ['price' => 10000]);
        $sub = $this->paidSubOrder($user, $product, ['status' => 'delivered', 'delivered_at' => now(), 'subtotal' => 20000, 'total' => 20000, 'commission' => 2000, 'vendor_earning' => 18000]);
        $item = $sub->items()->first();
        $item->update(['quantity' => 2, 'total' => 20000]);
        $headers = $this->authHeaders($user);

        // Damage claims need a photo.
        $this->withHeaders($headers)->postJson('/api/v1/account/returns', ['order_item_id' => $item->id, 'quantity' => 1, 'reason' => 'damaged'])
            ->assertStatus(422)->assertJsonValidationErrors('photos');

        $id = $this->withHeaders($headers)->postJson('/api/v1/account/returns', [
            'order_item_id' => $item->id, 'quantity' => 1, 'reason' => 'damaged', 'photos' => ['/storage/uploads/return/a.webp'],
        ])->assertCreated()->assertJsonPath('data.refund_amount', '10000.00')->json('data.id');

        // Can't request more than was bought.
        $this->withHeaders($headers)->postJson('/api/v1/account/returns', ['order_item_id' => $item->id, 'quantity' => 2, 'reason' => 'changed_mind'])
            ->assertStatus(422);

        $vh = $this->authHeaders($vendor);
        $this->withHeaders($vh)->putJson("/api/v1/vendor/returns/{$id}", ['action' => 'reject'])->assertStatus(422)->assertJsonValidationErrors('note');
        $this->withHeaders($vh)->putJson("/api/v1/vendor/returns/{$id}", ['action' => 'reject', 'note' => 'Looks fine'])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->withHeaders($headers)->postJson("/api/v1/account/returns/{$id}/escalate", ['note' => 'It is cracked'])->assertOk()->assertJsonPath('data.status', 'escalated');

        $this->withHeaders($this->authHeaders($admin))->putJson("/api/v1/admin/returns/{$id}", ['decision' => 'refund', 'note' => 'Photo shows a crack'])
            ->assertOk()->assertJsonPath('data.status', 'received')->assertJsonPath('data.refund_status', 'pending');

        $return = ReturnRequest::find($id);
        $this->assertEquals(9000, $return->seller_deduction); // 10,000 refund minus 10% commission share
        $this->assertSame('delivered', $sub->fresh()->status); // partial return keeps the shipment delivered

        // Next statement nets the deduction.
        $this->assertSame(9000.0, app(StatementService::class)->pending($store));
        $this->withHeaders($this->authHeaders($admin))->postJson('/api/v1/admin/statements/close')->assertOk();
        $this->assertEquals(-9000, Statement::first()->adjustments);
        $this->assertSame(Statement::first()->id, $return->fresh()->clawback_statement_id);
        $this->assertTrue(InboxNotification::where('user_id', $user->id)->where('type', 'return')->exists());
    }

    public function test_full_return_marks_shipment_returned(): void
    {
        $user = $this->makeUser();
        [$vendor, $store] = $this->makeVendor();
        $sub = $this->paidSubOrder($user, $this->makeProduct($store), ['status' => 'delivered', 'delivered_at' => now()]);
        $item = $sub->items()->first();

        $id = $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/returns', ['order_item_id' => $item->id, 'quantity' => 1, 'reason' => 'changed_mind'])->json('data.id');
        $vh = $this->authHeaders($vendor);
        $this->withHeaders($vh)->putJson("/api/v1/vendor/returns/{$id}", ['action' => 'receive'])->assertStatus(422);
        $this->withHeaders($vh)->putJson("/api/v1/vendor/returns/{$id}", ['action' => 'approve'])->assertOk();
        $this->withHeaders($vh)->putJson("/api/v1/vendor/returns/{$id}", ['action' => 'receive'])->assertOk();

        $this->assertSame('returned', $sub->fresh()->status);
        $this->assertEquals(0, ReturnRequest::find($id)->seller_deduction);
    }

    public function test_returns_close_after_seven_days(): void
    {
        $user = $this->makeUser();
        $sub = $this->paidSubOrder($user, $this->makeProduct(), ['status' => 'delivered', 'delivered_at' => now()->subDays(8)]);

        $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/returns', [
            'order_item_id' => $sub->items()->first()->id, 'quantity' => 1, 'reason' => 'changed_mind',
        ])->assertStatus(422);
    }

    public function test_inbox_pending_reviews_and_vouchers(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct();
        $other = $this->makeProduct(null, null, ['name' => 'Second']);
        $this->paidSubOrder($user, $product, ['status' => 'delivered']);
        $this->paidSubOrder($user, $other, ['status' => 'delivered']);
        Review::create(['user_id' => $user->id, 'product_id' => $other->id, 'rating' => 4]);
        InboxNotification::notify($user->id, 'order', 'Hello', 'Body');
        InboxNotification::notify($user->id, 'order', 'Hello again', 'Body');
        Coupon::create(['code' => 'PUBLIC', 'type' => 'percent', 'value' => 5, 'is_active' => true, 'is_public' => true]);
        Coupon::create(['code' => 'SECRET', 'type' => 'percent', 'value' => 5, 'is_active' => true, 'is_public' => false]);
        Coupon::create(['code' => 'WELCOME', 'type' => 'percent', 'value' => 5, 'is_active' => true, 'first_order_only' => true]);
        $headers = $this->authHeaders($user);

        $this->withHeaders($headers)->getJson('/api/v1/account/reviews/pending')->assertJsonCount(1, 'data')->assertJsonPath('data.0.product_id', $product->id);
        $this->withHeaders($headers)->getJson('/api/v1/account/vouchers')->assertJsonCount(1, 'data.available')->assertJsonPath('data.available.0.code', 'PUBLIC');

        $this->withHeaders($headers)->getJson('/api/v1/account/inbox')->assertJsonPath('meta.unread', 2);
        $this->withHeaders($headers)->postJson('/api/v1/account/inbox/read')->assertOk();
        $this->withHeaders($headers)->getJson('/api/v1/account/inbox')->assertJsonPath('meta.unread', 0);
    }

    public function test_reviews_update_ratings_and_hidden_reviews_do_not_count(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(null, null, ['rating' => 0, 'reviews_count' => 0]);
        $this->paidSubOrder($user, $product, ['status' => 'delivered']);

        $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/reviews', ['product_id' => $product->id, 'rating' => 4, 'title' => 'Lovely'])
            ->assertCreated()->assertJsonPath('data.title', 'Lovely');
        $this->assertEquals(4, $product->fresh()->rating);
        $this->assertSame(1, $product->fresh()->reviews_count);
    }

    public function test_address_book_keeps_exactly_one_default_and_validates_phones(): void
    {
        $user = $this->makeUser();
        $headers = $this->authHeaders($user);
        $base = ['full_name' => 'Ada', 'address_line' => '12 Admiralty Way', 'city' => 'Lekki', 'state' => 'Lagos'];

        $this->withHeaders($headers)->postJson('/api/v1/account/addresses', [...$base, 'phone' => '12345'])->assertStatus(422)->assertJsonValidationErrors('phone');
        $first = $this->withHeaders($headers)->postJson('/api/v1/account/addresses', [...$base, 'phone' => '0803 123 4567'])
            ->assertCreated()->assertJsonPath('data.is_default', true)->assertJsonPath('data.phone', '08031234567')->json('data.id');
        $second = $this->withHeaders($headers)->postJson('/api/v1/account/addresses', [...$base, 'phone' => '+2348031234567'])
            ->assertCreated()->assertJsonPath('data.is_default', false)->json('data.id');

        $this->withHeaders($headers)->putJson("/api/v1/account/addresses/{$second}", ['is_default' => true])->assertOk();
        $this->assertSame([$second], Address::where('user_id', $user->id)->where('is_default', true)->pluck('id')->all());

        $this->withHeaders($headers)->deleteJson("/api/v1/account/addresses/{$second}")->assertOk();
        $this->assertTrue(Address::find($first)->is_default);
    }

    public function test_profile_update_returns_full_session_user(): void
    {
        $user = $this->makeUser();
        $this->withHeaders($this->authHeaders($user))->putJson('/api/v1/account/profile', ['name' => 'Ada Lovelace', 'newsletter_opt_in' => true])
            ->assertOk()
            ->assertJsonPath('data.name', 'Ada Lovelace')
            ->assertJsonPath('data.newsletter_opt_in', true)
            ->assertJsonStructure(['data' => ['roles', 'email_verified', 'needs_onboarding']]);
    }
}
