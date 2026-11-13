<?php

namespace Tests\Feature;

use App\Models\AdminAction;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\InboxNotification;
use App\Models\PersonalAccessToken;
use App\Models\Review;
use App\Models\SubOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AdminConsoleTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function admin(): array
    {
        $admin = $this->makeAdmin();

        return [$admin, $this->authHeaders($admin)];
    }

    public function test_every_admin_endpoint_is_forbidden_to_customers_and_vendors(): void
    {
        [$vendor] = $this->makeVendor();
        foreach ([$this->authHeaders($this->makeUser()), $this->authHeaders($vendor)] as $headers) {
            foreach (['users', 'vendors', 'products', 'orders', 'returns', 'categories', 'brands', 'coupons', 'banners', 'reviews', 'payouts', 'messages', 'subscribers', 'audits', 'settings'] as $path) {
                $this->withHeaders($headers)->getJson('/api/v1/admin/'.$path)->assertForbidden();
            }
        }
    }

    public function test_overview_reports_queues_and_series(): void
    {
        [, $h] = $this->admin();
        $this->makeVendor(['status' => 'pending']);
        $this->paidSubOrder($this->makeUser(), $this->makeProduct(), ['refund_status' => 'pending']);

        $this->withHeaders($h)->getJson('/api/v1/admin/overview')
            ->assertOk()
            ->assertJsonPath('data.pending_vendors', 1)
            ->assertJsonPath('data.refunds_due', 1)
            ->assertJsonCount(30, 'data.series');
    }

    public function test_users_search_suspend_and_guard_rails(): void
    {
        [$admin, $h] = $this->admin();
        $target = $this->makeUser(['name' => 'Bola Ade', 'email' => 'bola@example.com']);
        $target->createToken('phone');

        $this->withHeaders($h)->getJson('/api/v1/admin/users?q=bola')->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 1);
        $this->withHeaders($h)->getJson('/api/v1/admin/users/'.$target->id)->assertOk()->assertJsonPath('data.email', 'bola@example.com');

        $this->withHeaders($h)->putJson('/api/v1/admin/users/'.$target->id, ['status' => 'suspended', 'reason' => 'Fraud'])
            ->assertOk()->assertJsonPath('data.status', 'suspended');
        $this->assertSame(0, PersonalAccessToken::where('user_id', $target->id)->count());

        $this->withHeaders($h)->putJson('/api/v1/admin/users/'.$target->id, ['role' => 'vendor'])->assertStatus(422);
        $this->withHeaders($h)->putJson('/api/v1/admin/users/'.$admin->id, ['status' => 'suspended'])->assertStatus(422);
        $this->assertTrue(AdminAction::where('action', 'user.updated')->where('subject_id', $target->id)->exists());
    }

    public function test_vendor_rejection_needs_a_reason_and_notifies_the_seller(): void
    {
        [, $h] = $this->admin();
        [$owner, $store] = $this->makeVendor(['status' => 'pending', 'account_number' => '0123456789']);

        $this->withHeaders($h)->putJson("/api/v1/admin/vendors/{$store->id}", ['status' => 'rejected'])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->withHeaders($h)->putJson("/api/v1/admin/vendors/{$store->id}", ['status' => 'rejected', 'reason' => 'Blurry ID'])
            ->assertOk()->assertJsonPath('data.status_reason', 'Blurry ID');

        $this->assertTrue(InboxNotification::where('user_id', $owner->id)->where('type', 'store')->exists());
        $this->withHeaders($h)->getJson("/api/v1/admin/vendors/{$store->id}")
            ->assertOk()
            ->assertJsonPath('data.store.account_number', '0123456789')
            ->assertJsonCount(1, 'data.history');
        $this->withHeaders($h)->getJson('/api/v1/admin/vendors?status=rejected')->assertJsonCount(1, 'data');
    }

    public function test_product_moderation_with_reasons_featuring_and_removal(): void
    {
        [, $h] = $this->admin();
        [$owner, $store] = $this->makeVendor();
        $product = $this->makeProduct($store, null, ['status' => 'pending', 'is_featured' => false]);

        $this->withHeaders($h)->putJson("/api/v1/admin/products/{$product->id}", ['status' => 'rejected'])->assertStatus(422);
        $this->withHeaders($h)->putJson("/api/v1/admin/products/{$product->id}", ['status' => 'rejected', 'reason' => 'Use a real photo'])
            ->assertOk()->assertJsonPath('data.rejection_reason', 'Use a real photo');
        $this->withHeaders($h)->putJson("/api/v1/admin/products/{$product->id}", ['status' => 'published', 'is_featured' => true])
            ->assertOk()->assertJsonPath('data.rejection_reason', null)->assertJsonPath('data.is_featured', true);
        $this->assertSame(2, InboxNotification::where('user_id', $owner->id)->where('type', 'product')->count());

        $this->withHeaders($h)->getJson('/api/v1/admin/products?status=published')->assertJsonCount(1, 'data');
        $this->withHeaders($h)->deleteJson("/api/v1/admin/products/{$product->id}")->assertOk();
        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    public function test_order_detail_override_and_refund_marking(): void
    {
        [, $h] = $this->admin();
        $buyer = $this->makeUser();
        $sub = $this->paidSubOrder($buyer, $this->makeProduct());

        $this->withHeaders($h)->getJson('/api/v1/admin/orders?q='.$sub->order->order_number)->assertJsonCount(1, 'data');
        $this->withHeaders($h)->getJson('/api/v1/admin/orders/'.$sub->order_id)->assertOk()->assertJsonCount(1, 'data.sub_orders');

        $this->withHeaders($h)->putJson("/api/v1/admin/sub-orders/{$sub->id}", ['refund_status' => 'refunded'])->assertStatus(422);
        $this->withHeaders($h)->putJson("/api/v1/admin/sub-orders/{$sub->id}", ['status' => 'cancelled', 'reason' => 'Seller unreachable'])
            ->assertOk()->assertJsonPath('data.refund_status', 'pending');
        $this->withHeaders($h)->getJson('/api/v1/admin/orders?refunds=1')->assertJsonCount(1, 'data');
        $this->withHeaders($h)->putJson("/api/v1/admin/sub-orders/{$sub->id}", ['refund_status' => 'refunded'])
            ->assertOk()->assertJsonPath('data.refund_status', 'refunded');
        $this->assertTrue(InboxNotification::where('user_id', $buyer->id)->where('title', 'Refund sent')->exists());
    }

    public function test_category_tree_rules(): void
    {
        [, $h] = $this->admin();
        $parent = $this->withHeaders($h)->postJson('/api/v1/admin/categories', ['name' => 'Fashion'])->assertCreated()->json('data');
        $child = $this->withHeaders($h)->postJson('/api/v1/admin/categories', ['name' => 'Dresses', 'parent_id' => $parent['id']])->assertCreated()->json('data');

        $this->withHeaders($h)->putJson("/api/v1/admin/categories/{$parent['id']}", ['parent_id' => $parent['id']])->assertStatus(422);
        $this->withHeaders($h)->putJson("/api/v1/admin/categories/{$parent['id']}", ['parent_id' => $child['id']])->assertStatus(422);
        $this->withHeaders($h)->putJson("/api/v1/admin/categories/{$child['id']}", ['is_active' => false, 'name' => 'Gowns'])->assertOk()->assertJsonPath('data.is_active', false);
        $this->getJson('/api/v1/categories')->assertJsonCount(0, 'data.0.children');

        $this->makeProduct(null, \App\Models\Category::find($child['id']));
        $this->withHeaders($h)->deleteJson("/api/v1/admin/categories/{$child['id']}")->assertStatus(422);
        $this->withHeaders($h)->deleteJson("/api/v1/admin/categories/{$parent['id']}")->assertStatus(422);
    }

    public function test_brands_crud_protects_used_brands(): void
    {
        [, $h] = $this->admin();
        $id = $this->withHeaders($h)->postJson('/api/v1/admin/brands', ['name' => 'Ada Couture'])->assertCreated()->assertJsonPath('data.slug', 'ada-couture')->json('data.id');
        $this->withHeaders($h)->postJson('/api/v1/admin/brands', ['name' => 'Ada Couture'])->assertStatus(422);
        $this->withHeaders($h)->putJson("/api/v1/admin/brands/{$id}", ['is_active' => false])->assertOk();

        $this->makeProduct(null, null, ['brand_id' => $id]);
        $this->withHeaders($h)->deleteJson("/api/v1/admin/brands/{$id}")->assertStatus(422);
        $unused = Brand::resolve('Unused');
        $this->withHeaders($h)->deleteJson("/api/v1/admin/brands/{$unused->id}")->assertOk();
    }

    public function test_voucher_crud_and_validation(): void
    {
        [, $h] = $this->admin();
        $this->withHeaders($h)->postJson('/api/v1/admin/coupons', ['code' => 'bad code', 'type' => 'percent', 'value' => 10])->assertStatus(422)->assertJsonValidationErrors('code');
        $this->withHeaders($h)->postJson('/api/v1/admin/coupons', ['code' => 'TOOBIG', 'type' => 'percent', 'value' => 95])->assertStatus(422)->assertJsonValidationErrors('value');

        $id = $this->withHeaders($h)->postJson('/api/v1/admin/coupons', [
            'code' => 'naija10', 'type' => 'percent', 'value' => 10, 'max_discount' => 5000, 'usage_limit' => 100,
            'starts_at' => now()->toIso8601String(), 'ends_at' => now()->addMonth()->toIso8601String(),
        ])->assertCreated()->assertJsonPath('data.code', 'NAIJA10')->json('data.id');

        $this->withHeaders($h)->postJson('/api/v1/admin/coupons', ['code' => 'NAIJA10', 'type' => 'fixed', 'value' => 100])->assertStatus(422);
        $this->withHeaders($h)->putJson("/api/v1/admin/coupons/{$id}", ['value' => 15])->assertOk()->assertJsonPath('data.value', '15.00');

        $order = $this->paidSubOrder($this->makeUser(), $this->makeProduct())->order;
        CouponRedemption::create(['coupon_id' => $id, 'user_id' => $order->user_id, 'order_id' => $order->id, 'discount' => 100, 'status' => 'redeemed']);
        $this->withHeaders($h)->deleteJson("/api/v1/admin/coupons/{$id}")->assertOk();
        $this->assertFalse(Coupon::find($id)->is_active);
    }

    public function test_banner_placement_and_schedule(): void
    {
        [, $h] = $this->admin();
        $this->withHeaders($h)->postJson('/api/v1/admin/banners', ['title' => 'Now', 'image' => '/a.jpg', 'placement' => 'tile'])->assertCreated();
        $this->withHeaders($h)->postJson('/api/v1/admin/banners', ['title' => 'Later', 'image' => '/b.jpg', 'starts_at' => now()->addDay()->toIso8601String()])->assertCreated();
        $this->withHeaders($h)->postJson('/api/v1/admin/banners', ['title' => 'Bad', 'image' => '/b.jpg', 'placement' => 'popup'])->assertStatus(422);

        $this->getJson('/api/v1/banners')->assertJsonCount(1, 'data')->assertJsonPath('data.0.placement', 'tile');

        $id = Banner::where('title', 'Now')->value('id');
        $this->withHeaders($h)->deleteJson("/api/v1/admin/banners/{$id}")->assertOk();
        $this->getJson('/api/v1/banners')->assertJsonCount(0, 'data');
    }

    public function test_hiding_a_review_recalculates_the_rating(): void
    {
        [, $h] = $this->admin();
        $product = $this->makeProduct(null, null, ['rating' => 0, 'reviews_count' => 0]);
        Review::create(['user_id' => $this->makeUser()->id, 'product_id' => $product->id, 'rating' => 5]);
        $spam = Review::create(['user_id' => $this->makeUser()->id, 'product_id' => $product->id, 'rating' => 1, 'comment' => 'spam']);

        $this->withHeaders($h)->getJson('/api/v1/admin/reviews?rating=2')->assertJsonCount(1, 'data');
        $this->withHeaders($h)->putJson("/api/v1/admin/reviews/{$spam->id}", ['is_hidden' => true])->assertOk();

        $this->assertEquals(5, $product->fresh()->rating);
        $this->assertSame(1, $product->fresh()->reviews_count);
    }

    public function test_settings_messages_subscribers_and_audit_log(): void
    {
        [, $h] = $this->admin();
        $this->withHeaders($h)->putJson('/api/v1/admin/settings', ['commission_rate' => 12, 'support_phone' => '0700 000 0000', 'announcement' => 'Free delivery this weekend'])
            ->assertOk()->assertJsonPath('data.commission_rate', 12);
        $this->withHeaders($h)->putJson('/api/v1/admin/settings', ['commission_rate' => 80])->assertStatus(422);
        $this->getJson('/api/v1/site')->assertJsonPath('data.announcement', 'Free delivery this weekend');

        $this->postJson('/api/v1/contact', ['name' => 'Ada', 'email' => 'a@example.com', 'topic' => 'order', 'message' => 'Where is my parcel please']);
        $this->postJson('/api/v1/newsletter', ['email' => 'fan@example.com']);
        $msg = DB::table('contact_messages')->value('id');

        $this->withHeaders($h)->getJson('/api/v1/admin/messages?status=open')->assertJsonCount(1, 'data');
        $this->withHeaders($h)->putJson("/api/v1/admin/messages/{$msg}", ['status' => 'closed'])->assertOk();
        $this->withHeaders($h)->getJson('/api/v1/admin/subscribers')->assertJsonCount(1, 'data');
        $this->withHeaders($h)->getJson('/api/v1/admin/audits?action=settings')->assertJsonCount(1, 'data');
    }

    public function test_admin_marks_return_refunds_as_sent(): void
    {
        [, $h] = $this->admin();
        $user = $this->makeUser();
        [$vendor, $store] = $this->makeVendor();
        $sub = $this->paidSubOrder($user, $this->makeProduct($store), ['status' => 'delivered', 'delivered_at' => now()]);
        $id = $this->withHeaders($this->authHeaders($user))->postJson('/api/v1/account/returns', [
            'order_item_id' => $sub->items()->first()->id, 'quantity' => 1, 'reason' => 'changed_mind',
        ])->json('data.id');
        $this->flushHeaders();

        $this->withHeaders($h)->putJson("/api/v1/admin/returns/{$id}", ['decision' => 'refunded'])->assertStatus(422);
        $this->withHeaders($h)->putJson("/api/v1/admin/returns/{$id}", ['decision' => 'refund'])->assertOk();
        $this->withHeaders($h)->getJson('/api/v1/admin/returns?refunds=1')->assertJsonCount(1, 'data');
        $this->withHeaders($h)->putJson("/api/v1/admin/returns/{$id}", ['decision' => 'refunded'])->assertOk()->assertJsonPath('data.refund_status', 'refunded');
        $this->assertSame('returned', SubOrder::find($sub->id)->status);
    }
}
