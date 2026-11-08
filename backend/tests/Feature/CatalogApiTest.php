<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class CatalogApiTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_lists_categories_and_active_banners(): void
    {
        $parent = $this->makeCategory(['name' => 'Fine Art', 'slug' => 'fine-art', 'sort_order' => 1]);
        $this->makeBanner(['title' => 'Live Banner', 'is_active' => true, 'sort_order' => 1]);
        $this->makeBanner(['title' => 'Hidden', 'is_active' => false, 'sort_order' => 2]);

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $parent->id);

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Live Banner');
    }

    public function test_products_filter_sort_and_hide_unpublished(): void
    {
        $category = $this->makeCategory(['name' => 'Textiles', 'slug' => 'textiles']);
        [, $store] = $this->makeVendor();
        $cheap = $this->makeProduct($store, $category, [
            'name' => 'Cheap Cloth',
            'slug' => 'cheap-cloth',
            'price' => 10000,
            'is_featured' => false,
        ]);
        $pricey = $this->makeProduct($store, $category, [
            'name' => 'Premium Cloth',
            'slug' => 'premium-cloth',
            'price' => 90000,
            'is_featured' => true,
        ]);
        $this->makeProduct($store, $category, [
            'name' => 'Draft Piece',
            'slug' => 'draft-piece',
            'status' => 'draft',
            'price' => 5000,
        ]);

        $this->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/v1/products?featured=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pricey->id);

        $this->getJson('/api/v1/products?category=textiles&sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.0.id', $cheap->id)
            ->assertJsonPath('data.1.id', $pricey->id);

        $this->getJson('/api/v1/products?min=50000&max=100000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pricey->id);

        $this->getJson('/api/v1/products?q=Premium')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_product_detail_and_404_for_unpublished(): void
    {
        $product = $this->makeProduct(null, null, ['slug' => 'lagos-canvas']);
        $draft = $this->makeProduct(null, null, ['slug' => 'secret-draft', 'status' => 'draft']);

        $this->getJson('/api/v1/products/lagos-canvas')
            ->assertOk()
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonStructure(['data' => ['images', 'store', 'category']]);

        $this->getJson('/api/v1/products/secret-draft')->assertNotFound();
        $this->getJson('/api/v1/products/missing')->assertNotFound();
        $this->assertSame('draft', $draft->status);
    }

    public function test_approved_stores_and_store_products(): void
    {
        [, $approved] = $this->makeVendor(['name' => 'Adebayo Studio', 'slug' => 'adebayo-studio', 'status' => 'approved']);
        [, $pending] = $this->makeVendor(['name' => 'Pending Studio', 'slug' => 'pending-studio', 'status' => 'pending']);
        $this->makeProduct($approved, null, ['name' => 'Studio Piece', 'slug' => 'studio-piece']);

        $this->getJson('/api/v1/stores')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'adebayo-studio');

        $this->getJson('/api/v1/stores/adebayo-studio')
            ->assertOk()
            ->assertJsonPath('data.id', $approved->id);

        $this->getJson('/api/v1/stores/pending-studio')->assertNotFound();

        $this->getJson('/api/v1/stores/adebayo-studio/products')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertSame('pending', $pending->status);
    }

    public function test_search_returns_products_and_stores(): void
    {
        [, $store] = $this->makeVendor(['name' => 'Indigo House', 'slug' => 'indigo-house']);
        $this->makeProduct($store, null, ['name' => 'Indigo Scarf', 'slug' => 'indigo-scarf']);

        $this->getJson('/api/v1/search?q=Indigo')
            ->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonCount(1, 'data.stores');
    }
}
