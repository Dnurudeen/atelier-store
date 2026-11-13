<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sponsorship;
use App\Models\Store;
use App\Services\SellerScoreService;
use App\Support\CatalogRails;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function __construct(private SellerScoreService $scores) {}

    public function categories()
    {
        $categories = Category::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->with(['children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('name')])
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function brands(Request $request)
    {
        $query = Brand::query()
            ->where('is_active', true)
            ->whereHas('products', fn ($q) => $this->publishedScope($q))
            ->withCount(['products' => fn ($q) => $this->publishedScope($q)])
            ->orderBy('name');

        if ($request->filled('category')) {
            $ids = $this->categoryIds($request->string('category')->toString());
            $query->whereHas('products', fn ($q) => $q->whereIn('category_id', $ids));
        }

        return response()->json(['data' => $query->get(['id', 'name', 'slug', 'logo'])]);
    }

    public function banners()
    {
        $banners = Banner::query()
            ->live()
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $banners]);
    }

    public function home()
    {
        // Sponsorship billing runs on the scheduler (sponsorships:accrue), never on public GETs.
        $deals = CatalogRails::uniqueImages(
            $this->onSale($this->published())->latest('id')->limit(40)->get(),
            12
        );

        $flashQuery = $this->onSale($this->published())
            ->whereNotNull('sale_ends_at')
            ->where('sale_ends_at', '<=', now()->addDays(7));
        $flash = CatalogRails::uniqueImages((clone $flashQuery)->orderBy('sale_ends_at')->limit(40)->get(), 12);
        $flashEndsAt = (clone $flashQuery)->min('sale_ends_at');

        $sponsored = CatalogRails::uniqueImages(
            $this->published()
                ->whereHas('sponsorships', fn ($query) => $query->where('status', 'active'))
                ->latest('id')
                ->limit(40)
                ->get(),
            12
        );

        $topSellers = CatalogRails::uniqueImages(
            $this->published()->orderByDesc('sold_count')->orderByDesc('rating')->limit(40)->get(),
            12
        );

        $newArrivals = CatalogRails::uniqueImages(
            $this->published()->latest('id')->limit(40)->get(),
            12
        );

        $categories = Category::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->with('children:id,parent_id')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Category $category) {
                $ids = $category->children->pluck('id')->push($category->id);
                $products = CatalogRails::uniqueImages(
                    $this->published()->whereIn('category_id', $ids)->latest('id')->limit(24)->get(),
                    10
                );
                $category->unsetRelation('children');

                return ['category' => $category, 'products' => $products];
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
                    $this->published()->where('store_id', $store->id)->latest('id')->limit(16)->get(),
                    8
                );

                return ['store' => $store, 'products' => $products];
            })
            ->filter(fn ($row) => count($row['products']) > 0)
            ->values();

        return response()->json([
            'data' => [
                'deals' => $deals,
                'flash' => $flash,
                'flash_ends_at' => $flashEndsAt,
                'sponsored' => $sponsored,
                'top_sellers' => $topSellers,
                'new_arrivals' => $newArrivals,
                'categories' => $categories,
                'stores' => $stores,
            ],
        ]);
    }

    public function products(Request $request)
    {
        $query = $this->published();
        $this->applyFilters($query, $request);

        $facets = null;
        if ($request->boolean('facets')) {
            $facets = $this->facets($request);
        }

        $this->applySort($query, $request);

        $perPage = max(1, min((int) $request->input('per_page', 24), 60));
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'facets' => $facets,
        ]);
    }

    public function product(string $slug)
    {
        $product = $this->published()
            ->with([
                'variants',
                'tags',
                'category.parent',
                'reviews' => fn ($query) => $query->where('is_hidden', false)->latest()->limit(50)->with('user:id,name'),
            ])
            ->where('slug', $slug)
            ->firstOrFail();

        $this->attachScore($product->store);

        $histogram = DB::table('reviews')
            ->where('product_id', $product->id)
            ->where('is_hidden', false)
            ->selectRaw('rating, count(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');
        $product->setAttribute('rating_breakdown', collect([5, 4, 3, 2, 1])->mapWithKeys(fn ($r) => [$r => (int) ($histogram[$r] ?? 0)]));
        $product->setAttribute('followers_count', $product->store?->followers()->count() ?? 0);

        return response()->json(['data' => $product]);
    }

    public function related(string $slug)
    {
        $product = Product::where('slug', $slug)->where('status', 'published')->firstOrFail();

        $similar = $this->published()
            ->where('id', '!=', $product->id)
            ->where('category_id', $product->category_id)
            ->orderByDesc('sold_count')
            ->limit(12)
            ->get();

        $fromSeller = $this->published()
            ->where('id', '!=', $product->id)
            ->where('store_id', $product->store_id)
            ->latest('id')
            ->limit(12)
            ->get();

        return response()->json(['data' => ['similar' => $similar, 'from_seller' => $fromSeller]]);
    }

    public function stores(Request $request)
    {
        $query = Store::query()
            ->where('status', 'approved')
            ->withCount(['products' => fn ($q) => $q->where('status', 'published')])
            ->orderByDesc('rating');

        if ($request->filled('q')) {
            $query->where('name', 'like', $this->like($request->string('q')));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(string $slug)
    {
        $store = Store::query()
            ->where('slug', $slug)
            ->where('status', 'approved')
            ->withCount(['products' => fn ($query) => $query->where('status', 'published'), 'followers'])
            ->firstOrFail();

        $this->attachScore($store);

        return response()->json(['data' => $store]);
    }

    public function storeProducts(Request $request, string $slug)
    {
        $store = Store::query()->where('slug', $slug)->where('status', 'approved')->firstOrFail();
        $request->merge(['store' => $store->id]);

        return $this->products($request);
    }

    /** Type-ahead suggestions for the header search box. */
    public function search(Request $request)
    {
        $term = trim((string) $request->input('q'));
        if (mb_strlen($term) < 2) {
            return response()->json(['data' => ['products' => [], 'stores' => [], 'categories' => []]]);
        }

        $q = $this->like($term);

        $products = $this->published()
            ->where('name', 'like', $q)
            ->orderByDesc('sold_count')
            ->limit(8)
            ->get();

        $stores = Store::query()
            ->where('status', 'approved')
            ->where('name', 'like', $q)
            ->limit(4)
            ->get();

        $categories = Category::query()
            ->where('is_active', true)
            ->where('name', 'like', $q)
            ->limit(4)
            ->get(['id', 'name', 'slug', 'parent_id']);

        return response()->json([
            'data' => [
                'products' => $products,
                'stores' => $stores,
                'categories' => $categories,
            ],
        ]);
    }

    private function applyFilters(Builder $query, Request $request, array $skip = []): void
    {
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->filled('store')) {
            $query->where('store_id', (int) $request->input('store'));
        }

        if ($request->filled('category') && ! in_array('category', $skip, true)) {
            $query->whereIn('category_id', $this->categoryIds($request->string('category')->toString()));
        }

        if ($request->filled('brand') && ! in_array('brand', $skip, true)) {
            $slugs = array_filter(explode(',', $request->string('brand')->toString()));
            $query->whereHas('brand', fn ($q) => $q->whereIn('slug', $slugs));
        }

        if ($request->filled('q')) {
            $q = $this->like($request->string('q'));
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', $q)
                    ->orWhere('description', 'like', $q)
                    ->orWhereHas('brand', fn ($b) => $b->where('name', 'like', $q))
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $q));
            });
        }

        if ($request->filled('min') && ! in_array('price', $skip, true)) {
            $query->where('price', '>=', (float) $request->input('min'));
        }

        if ($request->filled('max') && ! in_array('price', $skip, true)) {
            $query->where('price', '<=', (float) $request->input('max'));
        }

        if ($request->filled('rating')) {
            $query->where('rating', '>=', (float) $request->input('rating'));
        }

        if ($request->filled('discount')) {
            $pct = max(0, min(90, (int) $request->input('discount')));
            $this->onSale($query)->whereRaw('(compare_at_price - price) * 100 >= ? * compare_at_price', [$pct]);
        }

        if ($request->boolean('on_sale')) {
            $this->onSale($query);
        }

        if ($request->boolean('in_stock')) {
            $query->where('stock', '>', 0);
        }

        if ($request->filled('condition')) {
            $query->whereIn('condition', explode(',', $request->string('condition')->toString()));
        }

        foreach (['color', 'size'] as $attribute) {
            if ($request->filled($attribute) && ! in_array($attribute, $skip, true)) {
                $values = array_filter(explode(',', $request->string($attribute)->toString()));
                $query->whereHas('variants', function ($v) use ($attribute, $values) {
                    $v->where('stock', '>', 0)->where(function ($w) use ($attribute, $values) {
                        foreach ($values as $value) {
                            $w->orWhere('attributes->'.$attribute, $value);
                        }
                    });
                });
            }
        }
    }

    private function applySort(Builder $query, Request $request): void
    {
        $sort = $request->string('sort')->toString();

        if ($request->filled('category') && in_array($sort, ['', 'popular'], true)) {
            $query->orderByDesc(
                Sponsorship::selectRaw('CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END')
                    ->whereColumn('sponsorships.product_id', 'products.id')
                    ->where('status', 'active')
            );
        }

        match ($sort) {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'newest' => $query->orderByDesc('id'),
            'rating' => $query->orderByDesc('rating')->orderByDesc('reviews_count'),
            'discount' => $query->orderByRaw('CASE WHEN compare_at_price > price THEN (compare_at_price - price) / compare_at_price ELSE 0 END DESC'),
            default => $query->orderByDesc('is_featured')->orderByDesc('sold_count')->orderByDesc('id'),
        };
    }

    /** Filter options with counts, each computed with the other active filters applied. */
    private function facets(Request $request): array
    {

        $scoped = function (array $skip) use ($request) {
            $q = Product::query()->where('status', 'published')
                ->whereHas('store', fn ($s) => $s->where('status', 'approved'));
            $this->applyFilters($q, $request, $skip);

            return $q;
        };

        $brands = Brand::query()
            ->where('is_active', true)
            ->whereIn('id', $scoped(['brand'])->select('brand_id'))
            ->withCount(['products' => fn ($q) => $q->whereIn('products.id', $scoped(['brand'])->select('id'))])
            ->orderByDesc('products_count')
            ->limit(60)
            ->get(['id', 'name', 'slug']);

        $priceRow = $scoped(['price'])->selectRaw('MIN(price) as min_price, MAX(price) as max_price')->toBase()->first();

        $variantAttrs = fn (string $attr) => DB::table('product_variants')
            ->whereIn('product_id', $scoped([$attr])->select('id'))
            ->where('stock', '>', 0)
            ->pluck('attributes')
            ->map(fn ($json) => json_decode((string) $json, true)[$attr] ?? null)
            ->filter()
            ->countBy()
            ->sortDesc()
            ->map(fn ($count, $value) => ['value' => $value, 'count' => $count])
            ->values()
            ->take(30);

        $categoryCounts = $scoped(['category'])
            ->selectRaw('category_id, count(*) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        return [
            'brands' => $brands,
            'price' => [
                'min' => (float) ($priceRow->min_price ?? 0),
                'max' => (float) ($priceRow->max_price ?? 0),
            ],
            'colors' => $variantAttrs('color'),
            'sizes' => $variantAttrs('size'),
            'category_counts' => $categoryCounts,
        ];
    }

    /** A category slug plus all its sub-categories. */
    private function categoryIds(string $slug): array
    {
        $category = Category::with('children:id,parent_id')->where('slug', $slug)->first();
        if (! $category) {
            return [0];
        }

        return $category->children->pluck('id')->push($category->id)->all();
    }

    private function onSale(Builder $query): Builder
    {
        return $query->whereNotNull('compare_at_price')
            ->whereColumn('compare_at_price', '>', 'price')
            ->where(fn ($q) => $q->whereNull('sale_ends_at')->orWhere('sale_ends_at', '>', now()));
    }

    private function like(mixed $term): string
    {
        return '%'.str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], (string) $term).'%';
    }

    private function published(): Builder
    {
        return $this->publishedScope(
            Product::query()
                ->with(['images', 'store', 'category', 'brand:id,name,slug'])
                ->withExists(['sponsorships as is_sponsored' => fn ($query) => $query->where('status', 'active'), 'variants as has_variants'])
        );
    }

    private function publishedScope($query)
    {
        return $query->where('products.status', 'published')
            ->whereHas('store', fn ($q) => $q->where('status', 'approved'));
    }

    private function attachScore(?Store $store): void
    {
        if (! $store) {
            return;
        }

        $store->setAttribute('seller_score', $this->scores->forStore($store));
    }
}
