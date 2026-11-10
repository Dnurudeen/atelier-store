<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\Setting;
use App\Models\Store;
use App\Models\SubOrder;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        Setting::updateOrCreate(['key' => 'commission_rate'], ['value' => '10']);

        User::updateOrCreate(
            ['email' => 'admin@atelier.ng'],
            ['name' => 'Platform Admin', 'password' => Hash::make('password'), 'role' => 'admin']
        );

        $customer = User::updateOrCreate(
            ['email' => 'customer@atelier.ng'],
            ['name' => 'Ada Customer', 'password' => Hash::make('password'), 'role' => 'customer', 'phone' => '08030000001']
        );

        $categories = [
            ['Fine Art', 'fine-art'],
            ['Fashion', 'fashion'],
            ['Ceramics', 'ceramics'],
            ['Sculpture', 'sculpture'],
            ['Leatherwork', 'leatherwork'],
            ['Home Decor', 'home-decor'],
        ];

        $categoryModels = [];
        foreach ($categories as $i => [$name, $slug]) {
            $categoryModels[$slug] = Category::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'image' => "/media/categories/{$slug}.jpg",
                    'description' => "$name by Nigerian artisans",
                    'sort_order' => $i + 1,
                ]
            );
        }

        $vendors = [
            ['Adebayo Studio', 'adebayo-studio', 'Lagos', 'Contemporary oil paintings exploring Nigerian urban life.', 'vendor1@atelier.ng'],
            ['Clay & Ember', 'clay-and-ember', 'Abuja', 'Hand thrown ceramics and sculptural vessels.', 'vendor2@atelier.ng'],
            ['Okafor Leather', 'okafor-leather', 'Aba', 'Bespoke leather footwear and bags crafted in Aba.', 'vendor3@atelier.ng'],
            ['Heritage Weave', 'heritage-weave', 'Ibadan', 'Handwoven textiles and ready to wear fashion.', 'vendor4@atelier.ng'],
            ['Bronze Path', 'bronze-path', 'Benin City', 'Sculpture and metal reliefs rooted in Benin craft.', 'vendor5@atelier.ng'],
            ['Cedar & Loom', 'cedar-and-loom', 'Enugu', 'Furniture and home decor with warm timber tones.', 'vendor6@atelier.ng'],
            ['Indigo Atelier', 'indigo-atelier', 'Abeokuta', 'Adire fashion and textile art.', 'vendor7@atelier.ng'],
            ['Earth Form Lab', 'earth-form-lab', 'Jos', 'Experimental ceramics and clay installations.', 'vendor8@atelier.ng'],
        ];

        $stores = [];
        foreach ($vendors as $i => [$name, $slug, $location, $bio, $email]) {
            $n = ($i % 8) + 1;
            $user = User::updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => Hash::make('password'), 'role' => 'vendor']
            );

            $stores[] = Store::updateOrCreate(
                ['slug' => $slug],
                [
                    'user_id' => $user->id,
                    'name' => $name,
                    'bio' => $bio,
                    'location' => $location,
                    'status' => 'approved',
                    'shipping_fee' => 2000 + ($i * 250),
                    'rating' => 4.5 + ($i % 5) * 0.1,
                    'logo' => "/media/makers/avatar-{$n}.jpg",
                    'banner' => "/media/makers/banner-{$n}.jpg",
                    'bank_name' => '044',
                    'account_number' => '012345678' . $i,
                    'account_name' => $name,
                    'paystack_subaccount_code' => 'ACCT_demo_' . $slug,
                ]
            );
        }

        $demoVendor = User::updateOrCreate(
            ['email' => 'vendor@atelier.ng'],
            ['name' => 'Demo Vendor', 'password' => Hash::make('password'), 'role' => 'vendor']
        );
        Store::updateOrCreate(
            ['slug' => 'demo-vendor-studio'],
            [
                'user_id' => $demoVendor->id,
                'name' => 'Demo Vendor Studio',
                'bio' => 'Demo store for testing the vendor dashboard.',
                'location' => 'Lagos',
                'status' => 'approved',
                'shipping_fee' => 2500,
                'rating' => 4.8,
                'logo' => '/media/makers/avatar-1.jpg',
                'banner' => '/media/makers/banner-1.jpg',
            ]
        );

        $products = [
            ['Lagos Twilight Canvas', 185000, 'fine-art', 0, 1],
            ['Market Morning Oil', 150000, 'fine-art', 0, 2],
            ['Indigo Heritage Polo', 42000, 'fashion', 3, 3],
            ['Adire Wrap Dress', 62000, 'fashion', 6, 4],
            ['Carved Earth Vessel', 68000, 'ceramics', 1, 5],
            ['Terracotta Table Set', 54000, 'ceramics', 7, 6],
            ['Ancestral Figure Sculpture', 220000, 'sculpture', 4, 7],
            ['Bronze Mask Relief', 198000, 'sculpture', 4, 8],
            ['Hand Lasted Oxford', 95000, 'leatherwork', 2, 9],
            ['Saddle Leather Tote', 78000, 'leatherwork', 2, 10],
            ['Woven Accent Throw', 38000, 'home-decor', 3, 11],
            ['Cedar Side Table', 125000, 'home-decor', 5, 12],
        ];

        $expanded = $products;
        $suffixes = ['Edition', 'Series', 'Studio Cut', 'Signature', 'Collection'];
        for ($i = 0; $i < 48; $i++) {
            $base = $products[$i % count($products)];
            $expanded[] = [
                $base[0] . ' ' . $suffixes[$i % count($suffixes)] . ' ' . ($i + 1),
                (int) ($base[1] * (0.85 + (($i % 5) * 0.07))),
                $base[2],
                $i % count($stores),
                (($base[4] + $i) % 36) + 1,
            ];
        }

        $seeded = [];
        foreach ($expanded as $i => [$name, $price, $catSlug, $storeIndex, $imageN]) {
            $slug = Str::slug($name) . '-' . $i;
            $hasReviews = $i % 4 === 0;
            $product = Product::updateOrCreate(
                ['slug' => $slug],
                [
                    'store_id' => $stores[$storeIndex % count($stores)]->id,
                    'category_id' => $categoryModels[$catSlug]->id,
                    'name' => $name,
                    'description' => 'Crafted with care by a verified Atelier Nigeria maker. Each piece is unique and ships with a certificate of authenticity.',
                    'specs' => $this->specsFor($catSlug),
                    'price' => $price,
                    'compare_at_price' => $i % 4 === 0 ? (int) ($price * 1.15) : null,
                    'stock' => 3 + ($i % 10),
                    'status' => 'published',
                    'is_featured' => $i < 12,
                    'rating' => $hasReviews ? 5 : 0,
                    'reviews_count' => $hasReviews ? 1 : 0,
                ]
            );
            $seeded[] = [$product, $catSlug, $hasReviews];

            ProductImage::updateOrCreate(
                ['product_id' => $product->id, 'is_primary' => true],
                ['url' => '/media/products/product-' . $imageN . '.jpg', 'sort_order' => 0]
            );

            if ($imageN <= 12) {
                ProductImage::updateOrCreate(
                    ['product_id' => $product->id, 'sort_order' => 1],
                    [
                        'url' => '/media/products/gallery-' . $imageN . '.jpg',
                        'is_primary' => false,
                    ]
                );
            }

            $this->syncDemoVariants($product, $catSlug);
            if ($hasReviews) {
                Review::updateOrCreate(
                    ['user_id' => $customer->id, 'product_id' => $product->id],
                    ['rating' => 5, 'comment' => 'Arrived as described. Beautiful handmade work.']
                );
            } else {
                Review::where('product_id', $product->id)->where('user_id', $customer->id)->delete();
            }
        }

        foreach ($stores as $store) {
            $rated = Product::query()->where('store_id', $store->id)->where('reviews_count', '>', 0);
            $store->update([
                'rating' => round((float) ($rated->avg('rating') ?: 0), 2),
            ]);
        }

        $this->seedDeliveredOrder($customer, $seeded);

        Banner::updateOrCreate(
            ['title' => 'Creators and Handcrafted Excellence'],
            [
                'subtitle' => "Nigeria's marketplace for artisans, painters, and makers.",
                'image' => '/media/hero/hero-1.jpg',
                'cta_label' => 'Shop the collection',
                'cta_url' => '/shop',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );
        Banner::updateOrCreate(
            ['title' => 'Meet the Makers Behind Every Piece'],
            [
                'subtitle' => 'Discover original art, ceramics, leather, and furniture.',
                'image' => '/media/hero/hero-2.jpg',
                'cta_label' => 'Explore artisans',
                'cta_url' => '/makers',
                'is_active' => true,
                'sort_order' => 2,
            ]
        );
        Banner::updateOrCreate(
            ['title' => 'Join as a Vendor Today'],
            [
                'subtitle' => 'Turn your craft into a thriving business on Atelier Nigeria.',
                'image' => '/media/hero/hero-3.jpg',
                'cta_label' => 'Become a vendor',
                'cta_url' => '/become-a-vendor',
                'is_active' => true,
                'sort_order' => 3,
            ]
        );
    }

    private function specsFor(string $category): array
    {
        return match ($category) {
            'fine-art', 'sculpture' => ['medium' => 'Oil and pigment', 'dimensions' => '60 × 80 cm'],
            'fashion', 'leatherwork' => ['materials' => 'Hand-finished Nigerian craft'],
            default => ['materials' => 'Natural clay and timber', 'dimensions' => '18 cm'],
        };
    }

    private function syncDemoVariants(Product $product, string $category): void
    {
        $product->variants()->delete();

        $options = match ($category) {
            'fashion' => ['color' => ['Indigo', 'Clay'], 'size' => ['S', 'M', 'L']],
            'leatherwork' => ['color' => ['Brown', 'Black'], 'size' => ['40', '42', '44']],
            default => [],
        };

        if ($options === []) {
            return;
        }

        foreach ($options['color'] as $color) {
            foreach ($options['size'] as $size) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'name' => $color . ' / ' . $size,
                    'stock' => $product->stock,
                    'attributes' => ['color' => $color, 'size' => $size],
                ]);
            }
        }
    }

    private function seedDeliveredOrder(User $customer, array $seeded): void
    {
        $fashion = null;
        foreach ($seeded as [$product, $category]) {
            if ($category === 'fashion') {
                $fashion = $product;
                break;
            }
        }
        if (! $fashion) {
            return;
        }

        $price = (float) $fashion->price;
        $commission = round($price * 0.1, 2);
        $earning = round($price - $commission, 2);
        $paidAt = now()->subDays(3);

        $order = Order::updateOrCreate(
            ['order_number' => 'ATL-SEED-DELIVERED'],
            [
                'user_id' => $customer->id,
                'status' => 'delivered',
                'payment_status' => 'paid',
                'subtotal' => $price,
                'shipping_total' => 0,
                'total' => $price,
                'paystack_reference' => 'seed-delivered',
            ]
        );
        $order->forceFill(['created_at' => $paidAt, 'updated_at' => $paidAt])->save();

        $sub = SubOrder::updateOrCreate(
            ['order_id' => $order->id, 'store_id' => $fashion->store_id],
            [
                'status' => 'delivered',
                'subtotal' => $price,
                'shipping_fee' => 0,
                'total' => $price,
                'commission' => $commission,
                'vendor_earning' => $earning,
                'tracking_number' => 'ATL-TRACK-1001',
                'shipped_at' => $paidAt->copy()->addDay(),
                'delivered_at' => $paidAt->copy()->addDays(2),
            ]
        );

        OrderItem::updateOrCreate(
            ['sub_order_id' => $sub->id, 'product_id' => $fashion->id],
            [
                'product_name' => $fashion->name,
                'quantity' => 1,
                'unit_price' => $price,
                'total' => $price,
            ]
        );
    }
}
