<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_data_seeds_cleanly_twice_and_is_consistent(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class); // idempotent

        $this->assertSame(1, User::where('email', 'admin@atelier.ng')->count());
        $this->assertNotNull(User::where('email', 'customer@atelier.ng')->value('email_verified_at'));

        // Products live in leaf categories so they stay editable in the Seller Center.
        $this->assertSame(0, Product::whereHas('category', fn ($q) => $q->whereNull('parent_id'))->count());
        $this->assertGreaterThan(0, Category::whereNotNull('parent_id')->count());

        // Variant stock adds up to product stock.
        Product::has('variants')->with('variants')->get()->each(function (Product $p) {
            $this->assertSame((int) $p->variants->sum('stock'), (int) $p->stock, $p->name);
        });

        $this->assertTrue(Product::whereNotNull('brand_id')->exists());
        $this->assertTrue(Product::whereNotNull('sale_ends_at')->where('sale_ends_at', '>', now())->exists());
        $this->assertSame(2, Banner::where('placement', 'side')->count());
        $this->assertSame(2, Coupon::whereIn('code', ['WELCOME10', 'FREESHIP'])->count());

        $this->getJson('/api/v1/home-feed')->assertOk()->assertJsonPath('data.flash_ends_at', fn ($v) => $v !== null);
        $this->getJson('/api/v1/products?category=fashion&facets=1')->assertOk()->assertJsonPath('facets.colors', fn ($c) => count($c) > 2);
    }
}
