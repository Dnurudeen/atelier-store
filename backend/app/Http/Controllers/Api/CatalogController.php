<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Services\SellerScoreService;
use App\Services\SponsorshipService;
use App\Support\CatalogRails;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function __construct(
        private SellerScoreService $scores,
        private SponsorshipService $sponsorships,
    ) {}

    public function categories()
    {
        $categories = Category::query()
            ->whereNull('parent_id')
            ->with('children')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function banners()
    {
        $banners = Banner::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $banners]);
    }

    public function home()
    {
        // Sponsorship billing runs on the scheduler (sponsorships:accrue), never on public GETs.

        $deals = CatalogRails::uniqueImages(
            $this->published()
                ->whereNotNull('compare_at_price')
                ->whereColumn('compare_at_price', '>', 'price')
                ->where(function ($query) {
                    $query->whereNull('sale_ends_at')->orWhere('sale_ends_at', '>', now());
                })
                ->latest('id')
                ->limit(40)
                ->get(),
            12
        );

        $sponsored = CatalogRails::uniqueImages(
            $this->published()
                ->whereHas('sponsorships', fn ($query) => $query->where('status', 'active'))
                ->latest('id')
                ->limit(40)
                ->get(),
            12
        );

        $categories = Category::query()
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Category $category) {
                $products = CatalogRails::uniqueImages(
                    $this->published()
                        ->where('category_id', $category->id)
                        ->latest('id')
                        ->limit(24)
                        ->get(),
                    10
                );

                return [
                    'category' => $category,
                    'products' => $products,
                ];
            })
            ->filter(fn ($row) => count($row['products']) > 0)
            ->values();

        $stores = Store::query()
            ->where('status', 'approved')
            ->withCount(['products as products_count' => fn ($query) => $query->where('status', 'published')])
            ->orderByDesc('rating')
            ->limit(6)
            ->get()
            ->map(function (Store $store) {
                $products = CatalogRails::uniqueImages(
                    $this->published()
                        ->where('store_id', $store->id)
                        ->latest('id')
                        ->limit(16)
                        ->get(),
                    8
                );

                return [
                    'store' => $store,
                    'products' => $products,
                ];
            })
            ->filter(fn ($row) => count($row['products']) > 0)
            ->values();

        return response()->json([
            'data' => [
                'deals' => $deals,
                'sponsored' => $sponsored,
                'categories' => $categories,
                'stores' => $stores,
            ],
        ]);
    }

    public function products(Request $request)
    {
        $query = $this->published();

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->string('category')));
            $query->orderByDesc(
                \App\Models\Sponsorship::selectRaw('CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END')
                    ->whereColumn('sponsorships.product_id', 'products.id')
                    ->where('status', 'active')
            );
        }

        if ($request->filled('q')) {
            $q = '%'.$request->string('q').'%';
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', $q)
                    ->orWhere('description', 'like', $q);
            });
        }

        if ($request->filled('min')) {
            $query->where('price', '>=', (float) $request->input('min'));
        }

        if ($request->filled('max')) {
            $query->where('price', '<=', (float) $request->input('max'));
        }

        $sort = $request->string('sort')->toString();
        match ($sort) {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'newest' => $query->orderByDesc('id'),
            default => $query->orderByDesc('is_featured')->orderByDesc('id'),
        };

        $perPage = min((int) $request->input('per_page', 12), 48);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function product(string $slug)
    {
        $product = $this->published()
            ->with(['variants', 'tags', 'reviews' => fn ($query) => $query->latest()->with('user:id,name')])
            ->where('slug', $slug)
            ->firstOrFail();

        $this->attachScore($product->store);

        return response()->json(['data' => $product]);
    }

    public function stores()
    {
        $stores = Store::query()
            ->where('status', 'approved')
            ->withCount(['products' => fn ($query) => $query->where('status', 'published')])
            ->orderByDesc('rating')
            ->get();

        return response()->json(['data' => $stores]);
    }

    public function store(string $slug)
    {
        $store = Store::query()
            ->where('slug', $slug)
            ->where('status', 'approved')
            ->withCount(['products' => fn ($query) => $query->where('status', 'published')])
            ->firstOrFail();

        $this->attachScore($store);

        return response()->json(['data' => $store]);
    }

    public function storeProducts(string $slug)
    {
        $store = Store::query()->where('slug', $slug)->where('status', 'approved')->firstOrFail();

        $products = $this->published()
            ->where('store_id', $store->id)
            ->latest()
            ->get();

        return response()->json(['data' => $products]);
    }

    public function search(Request $request)
    {
        $q = '%'.$request->string('q').'%';

        $products = $this->published()
            ->where('name', 'like', $q)
            ->limit(12)
            ->get();

        $stores = Store::query()
            ->where('status', 'approved')
            ->where('name', 'like', $q)
            ->limit(8)
            ->get();

        return response()->json([
            'data' => [
                'products' => $products,
                'stores' => $stores,
            ],
        ]);
    }

    private function published()
    {
        return Product::query()
            ->with(['images', 'store', 'category'])
            ->withExists(['sponsorships as is_sponsored' => fn ($query) => $query->where('status', 'active')])
            ->where('status', 'published')
            ->whereHas('store', fn ($query) => $query->where('status', 'approved'));
    }

    private function attachScore(?Store $store): void
    {
        if (! $store) {
            return;
        }

        $store->setAttribute('seller_score', $this->scores->forStore($store));
    }
}
