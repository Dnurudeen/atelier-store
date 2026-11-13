<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class CatalogModelTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function fullPayload(int $categoryId, array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ankara Wrap Dress',
            'brand_name' => 'Ada Couture',
            'category_id' => $categoryId,
            'condition' => 'new',
            'description' => '<p>Hand-sewn wrap dress.</p>',
            'key_features' => "100% cotton\nAdjustable waist",
            'whats_in_box' => '1 x dress',
            'warranty' => '7-day return',
            'sku' => 'ADA-001',
            'price' => 25000,
            'compare_at_price' => 32000,
            'stock' => 0,
            'weight_kg' => 0.6,
            'length_cm' => 30, 'width_cm' => 25, 'height_cm' => 5,
            'specs' => [['label' => 'Material', 'value' => 'Cotton'], ['label' => 'Fit', 'value' => 'Regular']],
            'images' => ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
            'variants' => [
                ['attributes' => ['size' => 'S', 'color' => 'Red'], 'stock' => 3, 'sku' => 'ADA-001-S'],
                ['attributes' => ['size' => 'M', 'color' => 'Red'], 'stock' => 4, 'price' => 26000],
            ],
        ], $overrides);
    }

    // --- Uploads --------------------------------------------------------------------

    public function test_vendor_can_upload_product_images_and_they_are_converted(): void
    {
        Storage::fake('public');
        [$vendor] = $this->makeVendor();

        $res = $this->withHeaders($this->authHeaders($vendor))->post('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('photo.jpg', 2400, 1800),
            'purpose' => 'product',
        ])->assertCreated();

        $path = $res->json('data.path');
        Storage::disk('public')->assertExists($path);
        $this->assertStringStartsWith('uploads/product/', $path);
        if (function_exists('imagewebp')) {
            $this->assertStringEndsWith('.webp', $path);
            $this->assertLessThanOrEqual(1600, max($res->json('data.width'), $res->json('data.height')));
        }
    }

    public function test_uploads_reject_non_images_tiny_images_and_wrong_roles(): void
    {
        Storage::fake('public');
        $customer = $this->makeUser();

        $this->withHeaders($this->authHeaders($customer))->post('/api/v1/uploads', [
            'file' => UploadedFile::fake()->create('evil.svg', 10, 'image/svg+xml'),
            'purpose' => 'avatar',
        ])->assertStatus(422);

        $this->withHeaders($this->authHeaders($customer))->post('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('tiny.png', 50, 50),
            'purpose' => 'avatar',
        ])->assertStatus(422);

        $this->withHeaders($this->authHeaders($customer))->post('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('p.jpg', 400, 400),
            'purpose' => 'product',
        ])->assertForbidden();

        $this->flushHeaders();
        $this->post('/api/v1/uploads', ['purpose' => 'avatar'], ['Accept' => 'application/json'])->assertUnauthorized();
    }

    // --- Vendor products -------------------------------------------------------------

    public function test_vendor_creates_a_complete_listing_with_variants_and_gallery(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $category = $this->makeCategory(['name' => 'Dresses']);

        $res = $this->withHeaders($this->authHeaders($vendor))
            ->postJson('/api/v1/vendor/products', $this->fullPayload($category->id))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.brand.name', 'Ada Couture')
            ->assertJsonPath('data.stock', 7)
            ->assertJsonCount(2, 'data.images')
            ->assertJsonCount(2, 'data.variants')
            ->assertJsonPath('data.spec_list.0.label', 'Material');

        $product = Product::find($res->json('data.id'));
        $this->assertTrue((bool) $product->images()->where('url', 'https://cdn.example.com/a.jpg')->value('is_primary'));
        $this->assertSame('S / Red', ProductVariant::where('sku', 'ADA-001-S')->value('name'));
        $this->assertSame(1, Brand::count());
    }

    public function test_listing_validation_rules(): void
    {
        [$vendor] = $this->makeVendor();
        $parent = $this->makeCategory(['name' => 'Fashion']);
        $child = $this->makeCategory(['name' => 'Dresses', 'parent_id' => $parent->id]);
        $headers = $this->authHeaders($vendor);

        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($child->id, ['compare_at_price' => 20000]))
            ->assertStatus(422)->assertJsonValidationErrors('compare_at_price');

        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($parent->id))
            ->assertStatus(422)->assertJsonValidationErrors('category_id');

        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($child->id, ['images' => []]))
            ->assertStatus(422)->assertJsonValidationErrors('images');

        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($child->id, ['images' => ['javascript:alert(1)']]))
            ->assertStatus(422);

        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($child->id, [
            'variants' => [['attributes' => ['size' => 'S'], 'stock' => 1], ['attributes' => ['size' => 's'], 'stock' => 1]],
        ]))->assertStatus(422)->assertJsonValidationErrors('variants');

        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($child->id))->assertCreated();
        $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($child->id))
            ->assertStatus(422)->assertJsonValidationErrors('sku');
    }

    public function test_draft_can_be_saved_without_photos(): void
    {
        [$vendor] = $this->makeVendor();
        $category = $this->makeCategory();

        $this->withHeaders($this->authHeaders($vendor))
            ->postJson('/api/v1/vendor/products', $this->fullPayload($category->id, ['images' => [], 'status' => 'draft']))
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_variants_update_in_place_and_removed_ones_are_deleted(): void
    {
        [$vendor] = $this->makeVendor();
        $category = $this->makeCategory();
        $headers = $this->authHeaders($vendor);
        $created = $this->withHeaders($headers)->postJson('/api/v1/vendor/products', $this->fullPayload($category->id))->json('data');

        $keep = $created['variants'][0];
        $this->withHeaders($headers)->putJson('/api/v1/vendor/products/'.$created['id'], [
            'variants' => [['id' => $keep['id'], 'attributes' => $keep['attributes'], 'stock' => 10]],
        ])->assertOk()->assertJsonCount(1, 'data.variants')->assertJsonPath('data.stock', 10);

        $this->assertSame(10, ProductVariant::find($keep['id'])->stock);
    }

    public function test_vendor_list_filters_counts_duplicate_delete_and_bulk_inventory(): void
    {
        [$vendor, $store] = $this->makeVendor();
        $headers = $this->authHeaders($vendor);
        $a = $this->makeProduct($store, null, ['name' => 'Low one', 'stock' => 2]);
        $b = $this->makeProduct($store, null, ['name' => 'Empty one', 'stock' => 0, 'status' => 'draft']);
        $this->makeProduct(null, null, ['name' => 'Someone else']);

        $this->withHeaders($headers)->getJson('/api/v1/vendor/products?status=low_stock')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.counts.all', 2)->assertJsonPath('meta.counts.out_of_stock', 1);
        $this->withHeaders($headers)->getJson('/api/v1/vendor/products?q=Empty')->assertJsonCount(1, 'data');

        $copy = $this->withHeaders($headers)->postJson("/api/v1/vendor/products/{$a->id}/duplicate")
            ->assertCreated()->assertJsonPath('data.status', 'draft')->json('data');
        $this->assertCount(1, $copy['images']);

        $this->withHeaders($headers)->postJson('/api/v1/vendor/products/inventory', ['items' => [
            ['id' => $a->id, 'stock' => 50, 'price' => 45000],
            ['id' => 999999, 'stock' => 1],
        ]])->assertOk()->assertJsonPath('data.updated', 1);
        $this->assertSame(50, $a->fresh()->stock);

        $this->withHeaders($headers)->deleteJson("/api/v1/vendor/products/{$b->id}")->assertOk();
        $this->assertSoftDeleted('products', ['id' => $b->id]);
        $this->getJson('/api/v1/products/'.$b->slug)->assertNotFound();
    }

    public function test_vendor_cannot_touch_other_stores_products(): void
    {
        [$vendor] = $this->makeVendor();
        $foreign = $this->makeProduct();
        $headers = $this->authHeaders($vendor);

        $this->withHeaders($headers)->getJson("/api/v1/vendor/products/{$foreign->id}")->assertNotFound();
        $this->withHeaders($headers)->deleteJson("/api/v1/vendor/products/{$foreign->id}")->assertNotFound();
        $this->withHeaders($headers)->postJson("/api/v1/vendor/products/{$foreign->id}/duplicate")->assertNotFound();
    }

    // --- Public catalogue ------------------------------------------------------------

    public function test_catalog_filters_by_brand_price_discount_rating_stock_and_variant_attributes(): void
    {
        [, $store] = $this->makeVendor();
        $parent = $this->makeCategory(['name' => 'Fashion', 'slug' => 'fashion']);
        $child = $this->makeCategory(['name' => 'Dresses', 'slug' => 'dresses', 'parent_id' => $parent->id]);
        $nike = Brand::resolve('Nike');
        $ada = Brand::resolve('Ada');

        $p1 = $this->makeProduct($store, $child, ['name' => 'Red dress', 'brand_id' => $ada->id, 'price' => 10000, 'compare_at_price' => 20000, 'rating' => 4.6]);
        $this->makeProduct($store, $child, ['name' => 'Blue dress', 'brand_id' => $nike->id, 'price' => 50000, 'rating' => 3.1, 'stock' => 0]);
        $this->makeProduct($store, $parent, ['name' => 'Scarf', 'brand_id' => $ada->id, 'price' => 3000, 'rating' => 2]);
        ProductVariant::create(['product_id' => $p1->id, 'name' => 'Red / M', 'stock' => 2, 'attributes' => ['color' => 'Red', 'size' => 'M']]);

        $names = fn (string $qs) => collect($this->getJson('/api/v1/products?'.$qs)->assertOk()->json('data'))->pluck('name')->sort()->values()->all();

        $this->assertSame(['Blue dress', 'Red dress', 'Scarf'], $names('category=fashion'));
        $this->assertSame(['Blue dress', 'Red dress'], $names('category=dresses'));
        $this->assertSame(['Red dress', 'Scarf'], $names('brand=ada'));
        $this->assertSame(['Red dress', 'Scarf'], $names('max=20000'));
        $this->assertSame(['Red dress'], $names('discount=40'));
        $this->assertSame(['Red dress'], $names('rating=4'));
        $this->assertSame(['Red dress', 'Scarf'], $names('in_stock=1'));
        $this->assertSame(['Red dress'], $names('color=Red'));
        $this->assertSame(['Red dress'], $names('q=ada&category=dresses'));
        $this->assertSame([], $names('q=100%25'));

        $facets = $this->getJson('/api/v1/products?category=fashion&brand=ada&facets=1')->json('facets');
        $brandCounts = collect($facets['brands'])->pluck('products_count', 'slug')->all();
        $this->assertSame(['ada' => 2, 'nike' => 1], collect($brandCounts)->sortKeys()->all());
        $this->assertSame('Red', $facets['colors'][0]['value']);
        $this->assertEquals(3000, $facets['price']['min']);
    }

    public function test_product_detail_has_breakdown_followers_and_related(): void
    {
        [, $store] = $this->makeVendor();
        $category = $this->makeCategory();
        $product = $this->makeProduct($store, $category);
        $this->makeProduct($store, $category, ['name' => 'Sibling']);
        $buyer = $this->makeUser();
        Review::create(['user_id' => $buyer->id, 'product_id' => $product->id, 'rating' => 5, 'comment' => 'Great']);
        Review::create(['user_id' => $this->makeUser()->id, 'product_id' => $product->id, 'rating' => 1, 'comment' => 'spam', 'is_hidden' => true]);

        $this->getJson('/api/v1/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('data.rating_breakdown.5', 1)
            ->assertJsonPath('data.rating_breakdown.1', 0)
            ->assertJsonCount(1, 'data.reviews')
            ->assertJsonPath('data.followers_count', 0);

        $this->getJson('/api/v1/products/'.$product->slug.'/related')
            ->assertOk()
            ->assertJsonCount(1, 'data.similar')
            ->assertJsonCount(1, 'data.from_seller');
    }

    public function test_search_suggestions_and_brands_list(): void
    {
        $category = $this->makeCategory(['name' => 'Ceramics']);
        $this->makeProduct(null, $category, ['name' => 'Ceramic vase', 'brand_id' => Brand::resolve('Clay Co')->id]);

        $this->getJson('/api/v1/search?q=c')->assertOk()->assertJsonCount(0, 'data.products');
        $this->getJson('/api/v1/search?q=ceram')
            ->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonCount(1, 'data.categories');

        $this->getJson('/api/v1/brands')->assertOk()->assertJsonPath('data.0.name', 'Clay Co');
    }

    public function test_store_page_products_are_paginated_and_sortable(): void
    {
        [, $store] = $this->makeVendor();
        $this->makeProduct($store, null, ['name' => 'Cheap', 'price' => 100]);
        $this->makeProduct($store, null, ['name' => 'Dear', 'price' => 900]);

        $this->getJson("/api/v1/stores/{$store->slug}/products?sort=price_desc&per_page=1")
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Dear')
            ->assertJsonPath('meta.total', 2);
    }

    public function test_checkout_snapshots_variant_name_and_image(): void
    {
        $product = $this->makeProduct(null, null, ['stock' => 3]);
        $variant = ProductVariant::create(['product_id' => $product->id, 'name' => 'Large', 'stock' => 3, 'attributes' => ['size' => 'L']]);

        $this->withHeaders($this->authHeaders($this->makeUser()))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'variant_id' => $variant->id, 'quantity' => 1]],
            'shipping_address' => ['full_name' => 'A', 'phone' => '0801', 'address_line' => 'S', 'city' => 'L', 'state' => 'Lagos'],
        ])->assertOk();

        $this->assertDatabaseHas('order_items', ['variant_name' => 'Large', 'image' => '/media/products/product-1.jpg']);
    }
}
