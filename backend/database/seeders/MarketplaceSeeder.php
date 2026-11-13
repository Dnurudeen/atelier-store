<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Brand;
use App\Models\Coupon;
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
        Setting::updateOrCreate(['key' => 'support_email'], ['value' => 'hello@atelierstore.studio']);

        User::updateOrCreate(
            ['email' => 'admin@atelier.ng'],
            ['name' => 'Platform Admin', 'password' => Hash::make('password'), 'role' => 'admin']
        )->forceFill(['email_verified_at' => now()])->save();

        $customer = User::updateOrCreate(
            ['email' => 'customer@atelier.ng'],
            ['name' => 'Ada Customer', 'password' => Hash::make('password'), 'role' => 'customer', 'phone' => '08030000001']
        );
        $customer->forceFill(['email_verified_at' => now()])->save();

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

        $subcategories = [
            'fine-art' => [['Paintings', 'paintings'], ['Prints & Photography', 'prints-photography']],
            'fashion' => [['Dresses & Kaftans', 'dresses-kaftans'], ['Shirts & Tops', 'shirts-tops']],
            'ceramics' => [['Vases & Vessels', 'vases-vessels'], ['Tableware', 'tableware']],
            'sculpture' => [['Wood Carvings', 'wood-carvings'], ['Bronze & Metal', 'bronze-metal']],
            'leatherwork' => [['Bags', 'leather-bags'], ['Shoes & Sandals', 'shoes-sandals']],
            'home-decor' => [['Furniture', 'furniture'], ['Textiles & Throws', 'textiles-throws']],
        ];
        $leaves = [];
        foreach ($subcategories as $parentSlug => $children) {
            foreach ($children as $j => [$name, $slug]) {
                $leaves[$parentSlug][] = Category::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'name' => $name,
                        'parent_id' => $categoryModels[$parentSlug]->id,
                        'image' => "/media/categories/{$parentSlug}.jpg",
                        'description' => "$name handmade in Nigeria",
                        'sort_order' => $j + 1,
                        'is_active' => true,
                    ]
                );
            }
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
            $store = $stores[$storeIndex % count($stores)];
            $onSale = $i % 4 === 0 || $i % 7 === 0;
            $product = Product::updateOrCreate(
                ['slug' => $slug],
                [
                    'store_id' => $store->id,
                    'category_id' => $leaves[$catSlug][$i % 2]->id,
                    'brand_id' => Brand::resolve($store->name)->id,
                    'name' => $name,
                    'sku' => strtoupper(Str::substr(Str::slug($store->name, ''), 0, 4)).'-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                    'condition' => 'new',
                    'description' => "Crafted with care by {$store->name}, a verified Atelier Nigeria maker in {$store->location}.\n\nEvery piece is made by hand, so small variations in colour and texture are part of its character. It ships carefully packed with a certificate of authenticity.",
                    'key_features' => $this->featuresFor($catSlug),
                    'whats_in_box' => "1 × {$name}\n1 × Certificate of authenticity",
                    'warranty' => '7-day return for items that arrive damaged',
                    'specs' => $this->specsFor($catSlug),
                    'price' => $price,
                    'compare_at_price' => $onSale ? (int) ($price * ($i % 7 === 0 ? 1.4 : 1.15)) : null,
                    // A handful of deals end soon so the home page shows a live Flash Sale countdown.
                    'sale_ends_at' => $onSale && $i % 3 === 0 ? now()->addDays(2 + ($i % 4))->setTime(23, 59) : null,
                    'stock' => 3 + ($i % 10),
                    'weight_kg' => in_array($catSlug, ['fashion', 'leatherwork'], true) ? 0.8 : 3.5,
                    'status' => 'published',
                    'is_featured' => $i < 12,
                    'sold_count' => ($i * 7) % 40,
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
            ['title' => 'Handmade Gifts They Will Keep'],
            ['subtitle' => 'Under ₦50,000', 'image' => '/media/makers/banner-2.jpg', 'cta_label' => 'Shop gifts', 'cta_url' => '/shop?max=50000', 'placement' => 'side', 'is_active' => true, 'sort_order' => 1]
        );
        Banner::updateOrCreate(
            ['title' => 'Flash Sales This Week'],
            ['subtitle' => 'Up to 40% off', 'image' => '/media/makers/banner-5.jpg', 'cta_label' => 'See deals', 'cta_url' => '/shop?on_sale=1&sort=discount', 'placement' => 'side', 'is_active' => true, 'sort_order' => 2]
        );

        Coupon::updateOrCreate(['code' => 'WELCOME10'], [
            'description' => '10% off your first order (up to ₦5,000)',
            'type' => 'percent', 'value' => 10, 'max_discount' => 5000, 'per_user_limit' => 1,
            'first_order_only' => true, 'is_public' => true, 'is_active' => true,
        ]);
        Coupon::updateOrCreate(['code' => 'FREESHIP'], [
            'description' => 'Free delivery on orders over ₦50,000',
            'type' => 'free_shipping', 'value' => 0, 'min_order' => 50000, 'per_user_limit' => 3,
            'is_public' => true, 'is_active' => true,
        ]);

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
        $rows = match ($category) {
            'fine-art' => [['Medium', 'Oil on stretched canvas'], ['Dimensions', '60 × 80 cm'], ['Framing', 'Unframed, ready to hang']],
            'sculpture' => [['Material', 'Hand-carved hardwood'], ['Height', '45 cm'], ['Finish', 'Natural oil']],
            'fashion' => [['Fabric', '100% cotton adire'], ['Fit', 'Regular'], ['Care', 'Hand wash cold']],
            'leatherwork' => [['Material', 'Full-grain cow leather'], ['Lining', 'Cotton'], ['Made in', 'Aba, Abia State']],
            'ceramics' => [['Material', 'Stoneware clay'], ['Height', '18 cm'], ['Food safe', 'Yes']],
            default => [['Material', 'Iroko wood and woven fibre'], ['Dimensions', '50 × 40 × 45 cm']],
        };

        return array_map(fn ($r) => ['label' => $r[0], 'value' => $r[1]], $rows);
    }

    private function featuresFor(string $category): string
    {
        return match ($category) {
            'fine-art' => "Original, signed by the artist\nCertificate of authenticity\nShipped rolled in a protective tube",
            'fashion' => "Hand-dyed adire pattern\nBreathable cotton for warm weather\nEvery piece is one of a kind",
            'leatherwork' => "Hand-stitched in Aba\nFull-grain leather that ages beautifully\nSolid brass hardware",
            'ceramics' => "Wheel-thrown by hand\nGlazed inside, raw clay outside\nDishwasher safe",
            'sculpture' => "Carved from a single block\nSigned base\nIndoor display",
            default => "Handmade by a Nigerian artisan\nSustainably sourced materials\nAssembled before delivery",
        };
    }

    private function syncDemoVariants(Product $product, string $category): void
    {
        $product->variants()->delete();

        $palette = [['Indigo', 'Clay'], ['Ochre', 'Indigo'], ['Ivory', 'Clay'], ['Brown', 'Black'], ['Tan', 'Black']];
        $pick = $palette[$product->id % count($palette)];
        $options = match ($category) {
            'fashion' => ['color' => $pick, 'size' => ['S', 'M', 'L']],
            'leatherwork' => ['color' => $product->id % 2 ? ['Brown', 'Black'] : ['Tan', 'Black'], 'size' => ['40', '42', '44']],
            default => [],
        };

        if ($options === []) {
            return;
        }

        // Split the product's stock across its options (product stock = sum of variants).
        $combos = [];
        foreach ($options['color'] as $color) {
            foreach ($options['size'] as $size) {
                $combos[] = ['color' => $color, 'size' => $size];
            }
        }
        foreach ($combos as $k => $attrs) {
            ProductVariant::create([
                'product_id' => $product->id,
                'name' => $attrs['color'].' / '.$attrs['size'],
                'sku' => $product->sku ? $product->sku.'-'.strtoupper(substr($attrs['color'], 0, 2)).$attrs['size'] : null,
                'stock' => $k === 0 ? 0 : 1 + (($product->id + $k) % 4),
                'attributes' => $attrs,
            ]);
        }
        $product->syncStockFromVariants();
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
