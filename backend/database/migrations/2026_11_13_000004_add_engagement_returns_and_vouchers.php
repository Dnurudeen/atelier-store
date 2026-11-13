<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->string('title', 120)->nullable()->after('rating');
            $table->boolean('is_hidden')->default(false)->after('comment');
            $table->text('vendor_reply')->nullable()->after('is_hidden');
            $table->timestamp('vendor_replied_at')->nullable()->after('vendor_reply');
        });

        Schema::create('store_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'store_id']);
        });

        Schema::create('notifications_inbox', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40); // order|return|review|store|system
            $table->string('title', 160);
            $table->text('body')->nullable();
            $table->string('link')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at']);
        });

        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sub_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('reason', 60);
            $table->text('details')->nullable();
            $table->json('photos')->nullable();
            // requested → approved → received (refund) | rejected | escalated → resolved
            $table->string('status', 20)->default('requested');
            $table->text('vendor_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status']);
        });

        Schema::table('coupons', function (Blueprint $table) {
            $table->string('description')->nullable()->after('code');
            $table->decimal('max_discount', 12, 2)->nullable()->after('min_order');
            $table->unsignedInteger('usage_limit')->nullable()->after('max_discount');
            $table->unsignedInteger('per_user_limit')->default(1)->after('usage_limit');
            $table->unsignedInteger('used_count')->default(0)->after('per_user_limit');
            $table->foreignId('store_id')->nullable()->after('used_count')->constrained()->nullOnDelete();
            $table->foreignId('category_id')->nullable()->after('store_id')->constrained()->nullOnDelete();
            $table->boolean('first_order_only')->default(false)->after('category_id');
            $table->boolean('is_public')->default(true)->after('first_order_only');
        });

        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->decimal('discount', 12, 2);
            $table->string('status', 20)->default('reserved'); // reserved|redeemed|released
            $table->timestamps();
            $table->unique(['coupon_id', 'order_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('discount_total', 12, 2)->default(0)->after('shipping_total');
            $table->string('coupon_code', 60)->nullable()->after('discount_total');
        });

        Schema::table('sub_orders', function (Blueprint $table) {
            $table->decimal('discount', 12, 2)->default(0)->after('shipping_fee');
        });

        Schema::table('banners', function (Blueprint $table) {
            $table->string('placement', 20)->default('hero')->after('cta_url'); // hero|side|tile
            $table->string('background', 20)->nullable()->after('placement');
            $table->timestamp('starts_at')->nullable()->after('is_active');
            $table->timestamp('ends_at')->nullable()->after('starts_at');
        });

        Schema::create('admin_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 80);
            $table->string('subject_type', 60)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_actions');
        Schema::table('banners', fn (Blueprint $t) => $t->dropColumn(['placement', 'background', 'starts_at', 'ends_at']));
        Schema::table('sub_orders', fn (Blueprint $t) => $t->dropColumn('discount'));
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['discount_total', 'coupon_code']));
        Schema::dropIfExists('coupon_redemptions');
        Schema::table('coupons', function (Blueprint $t) {
            $t->dropConstrainedForeignId('store_id');
            $t->dropConstrainedForeignId('category_id');
            $t->dropColumn(['description', 'max_discount', 'usage_limit', 'per_user_limit', 'used_count', 'first_order_only', 'is_public']);
        });
        Schema::dropIfExists('return_requests');
        Schema::dropIfExists('notifications_inbox');
        Schema::dropIfExists('store_follows');
        Schema::table('reviews', fn (Blueprint $t) => $t->dropColumn(['title', 'is_hidden', 'vendor_reply', 'vendor_replied_at']));
    }
};
