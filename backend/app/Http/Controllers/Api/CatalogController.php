<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
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

    public function products(Request $request)
    {
        $query = Product::query()
            ->with(['images', 'store', 'category', 'variants'])
            ->where('status', 'published')
            ->whereHas('store', fn ($q) => $q->where('status', 'approved'));

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->filled('category')) {
            $query->whereHas('category', fn($q) => $q->where('slug', $request->string('category')));
        }

        if ($request->filled('q')) {
            $q = '%' . $request->string('q') . '%';
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
        $product = Product::query()
            ->with(['images', 'store', 'category', 'variants', 'tags', 'reviews.user'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->whereHas('store', fn ($q) => $q->where('status', 'approved'))
            ->firstOrFail();

        return response()->json(['data' => $product]);
    }

    public function stores()
    {
        $stores = Store::query()
            ->where('status', 'approved')
            ->withCount('products')
            ->orderByDesc('rating')
            ->get();

        return response()->json(['data' => $stores]);
    }

    public function store(string $slug)
    {
        $store = Store::query()
            ->where('slug', $slug)
            ->where('status', 'approved')
            ->withCount('products')
            ->firstOrFail();

        return response()->json(['data' => $store]);
    }

    public function storeProducts(string $slug)
    {
        $store = Store::query()->where('slug', $slug)->where('status', 'approved')->firstOrFail();

        $products = Product::query()
            ->with(['images', 'category'])
            ->where('store_id', $store->id)
            ->where('status', 'published')
            ->latest()
            ->get();

        return response()->json(['data' => $products]);
    }

    public function search(Request $request)
    {
        $q = '%' . $request->string('q') . '%';

        $products = Product::query()
            ->with(['images', 'store'])
            ->where('status', 'published')
            ->whereHas('store', fn ($builder) => $builder->where('status', 'approved'))
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
}
