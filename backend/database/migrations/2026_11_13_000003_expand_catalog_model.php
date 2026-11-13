<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->string('logo')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('brand_id')->nullable()->after('category_id')->constrained()->nullOnDelete();
            $table->string('sku', 80)->nullable()->after('slug');
            $table->string('condition', 20)->default('new')->after('sku'); // new|refurbished|used
            $table->text('key_features')->nullable()->after('description');
            $table->text('whats_in_box')->nullable()->after('key_features');
            $table->string('warranty', 160)->nullable()->after('whats_in_box');
            $table->decimal('weight_kg', 8, 3)->nullable()->after('stock');
            $table->decimal('length_cm', 8, 2)->nullable()->after('weight_kg');
            $table->decimal('width_cm', 8, 2)->nullable()->after('length_cm');
            $table->decimal('height_cm', 8, 2)->nullable()->after('width_cm');
            $table->string('meta_title', 160)->nullable();
            $table->string('meta_description', 320)->nullable();
            $table->unsignedInteger('sold_count')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->softDeletes();
            $table->index(['status', 'category_id']);
            $table->index(['status', 'price']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('sort_order');
            $table->string('icon', 60)->nullable()->after('image');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('variant_name')->nullable()->after('product_name');
            $table->string('image')->nullable()->after('variant_name');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $table) => $table->dropColumn(['variant_name', 'image']));
        Schema::table('categories', fn (Blueprint $table) => $table->dropColumn(['is_active', 'icon']));
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['status', 'category_id']);
            $table->dropIndex(['status', 'price']);
            $table->dropConstrainedForeignId('brand_id');
            $table->dropSoftDeletes();
            $table->dropColumn([
                'sku', 'condition', 'key_features', 'whats_in_box', 'warranty', 'weight_kg',
                'length_cm', 'width_cm', 'height_cm', 'meta_title', 'meta_description',
                'sold_count', 'low_stock_threshold',
            ]);
        });
        Schema::dropIfExists('brands');
    }
};
