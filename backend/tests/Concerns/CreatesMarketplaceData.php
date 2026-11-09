<?php

namespace Tests\Concerns;

use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Str;

trait CreatesMarketplaceData
{
    protected function makeUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Test User',
            'email' => 'user_' . Str::random(8) . '@atelier.test',
            'password' => 'password',
            'role' => 'customer',
            'api_token' => hash('sha256', Str::random(40)),
            'onboarding_completed_at' => now(),
        ], $overrides));
    }

    protected function makeVendor(array $storeOverrides = [], array $userOverrides = []): array
    {
        $user = $this->makeUser(array_merge([
            'name' => 'Vendor User',
            'email' => 'vendor_' . Str::random(8) . '@atelier.test',
            'role' => 'vendor',
        ], $userOverrides));

        $store = Store::create(array_merge([
            'user_id' => $user->id,
            'name' => 'Test Studio',
            'slug' => 'test-studio-' . Str::lower(Str::random(5)),
            'status' => 'approved',
            'shipping_fee' => 2500,
            'rating' => 4.8,
            'bio' => 'A test artisan studio',
            'location' => 'Lagos',
        ], $storeOverrides));

        return [$user, $store];
    }

    protected function makeAdmin(array $overrides = []): User
    {
        return $this->makeUser(array_merge([
            'name' => 'Admin User',
            'email' => 'admin_' . Str::random(8) . '@atelier.test',
            'role' => 'admin',
        ], $overrides));
    }

    protected function makeCategory(array $overrides = []): Category
    {
        $name = $overrides['name'] ?? 'Fine Art';

        return Category::create(array_merge([
            'name' => $name,
            'slug' => $overrides['slug'] ?? Str::slug($name) . '-' . Str::lower(Str::random(4)),
            'image' => '/media/categories/fine-art.jpg',
            'description' => 'Test category',
            'sort_order' => 1,
        ], $overrides));
    }

    protected function makeProduct(?Store $store = null, ?Category $category = null, array $overrides = []): Product
    {
        if (! $store) {
            [, $store] = $this->makeVendor();
        }
        $category ??= $this->makeCategory();

        $name = $overrides['name'] ?? 'Lagos Twilight Canvas';
        $product = Product::create(array_merge([
            'store_id' => $store->id,
            'category_id' => $category->id,
            'name' => $name,
            'slug' => $overrides['slug'] ?? Str::slug($name) . '-' . Str::lower(Str::random(5)),
            'description' => 'Handcrafted test product',
            'price' => 50000,
            'stock' => 10,
            'status' => 'published',
            'is_featured' => true,
            'rating' => 4.5,
            'reviews_count' => 3,
        ], $overrides));

        ProductImage::create([
            'product_id' => $product->id,
            'url' => '/media/products/product-1.jpg',
            'is_primary' => true,
            'sort_order' => 0,
        ]);

        return $product->fresh('images', 'store', 'category');
    }

    protected function makeBanner(array $overrides = []): Banner
    {
        return Banner::create(array_merge([
            'title' => 'Empowering Creators',
            'subtitle' => 'Handcrafted excellence',
            'image' => '/media/hero/hero-1.jpg',
            'cta_label' => 'Shop now',
            'cta_url' => '/shop',
            'is_active' => true,
            'sort_order' => 1,
        ], $overrides));
    }

    protected function withCommission(float $rate = 10): void
    {
        Setting::updateOrCreate(['key' => 'commission_rate'], ['value' => (string) $rate]);
    }

    protected function authHeaders(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . $user->api_token,
            'Accept' => 'application/json',
        ];
    }
}
