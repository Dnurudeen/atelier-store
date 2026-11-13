<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Seller Center catalogue management.
 *
 * Status flow: draft → pending (submitted) → published | rejected.
 * Content edits on a published listing send it back to pending; price/stock edits stay live.
 */
class VendorProductController extends Controller
{
    /** Fields whose change requires re-moderation of a live listing. */
    private const MODERATED = ['name', 'description', 'key_features', 'whats_in_box', 'category_id', 'brand_id', 'specs', 'condition'];

    public function index(Request $request)
    {
        $store = $this->sellerStore($request);
        $query = Product::with(['images', 'category', 'brand', 'variants'])
            ->where('store_id', $store->id);

        if ($request->filled('status')) {
            $status = $request->string('status')->toString();
            if ($status === 'low_stock') {
                $query->whereColumn('stock', '<=', 'low_stock_threshold')->where('stock', '>', 0);
            } elseif ($status === 'out_of_stock') {
                $query->where('stock', '<=', 0);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('q')) {
            $q = '%'.str_replace(['%', '_'], ['\%', '\_'], $request->string('q')).'%';
            $query->where(fn ($b) => $b->where('name', 'like', $q)->orWhere('sku', 'like', $q));
        }

        $sort = $request->string('sort')->toString();
        match ($sort) {
            'stock' => $query->orderBy('stock'),
            'price' => $query->orderBy('price'),
            'best_selling' => $query->orderByDesc('sold_count'),
            default => $query->latest('id'),
        };

        $paginator = $query->paginate(min((int) $request->input('per_page', 20), 100));

        $counts = Product::where('store_id', $store->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'counts' => [
                    'all' => (int) $counts->sum(),
                    'draft' => (int) ($counts['draft'] ?? 0),
                    'pending' => (int) ($counts['pending'] ?? 0),
                    'published' => (int) ($counts['published'] ?? 0),
                    'rejected' => (int) ($counts['rejected'] ?? 0),
                    'low_stock' => Product::where('store_id', $store->id)->whereColumn('stock', '<=', 'low_stock_threshold')->where('stock', '>', 0)->count(),
                    'out_of_stock' => Product::where('store_id', $store->id)->where('stock', '<=', 0)->count(),
                ],
            ],
        ]);
    }

    public function show(Request $request, int $id)
    {
        $product = $this->find($request, $id);

        return response()->json(['data' => $product->load(['images', 'category.parent', 'brand', 'variants'])]);
    }

    public function store(Request $request)
    {
        $store = $this->sellerStore($request);
        $data = $this->validated($request);

        $product = DB::transaction(function () use ($store, $data) {
            $product = new Product([
                'store_id' => $store->id,
                'slug' => $this->uniqueSlug($data['name']),
                'status' => ($data['status'] ?? null) === 'draft' ? 'draft' : 'pending',
            ]);
            $this->fill($product, $data);
            $product->save();

            $this->syncImages($product, $data);
            $this->syncVariants($product, $data);

            return $product;
        });

        return response()->json(['data' => $product->fresh(['images', 'variants', 'category', 'brand'])], 201);
    }

    public function update(Request $request, int $id)
    {
        $product = $this->find($request, $id);
        $data = $this->validated($request, $product);

        DB::transaction(function () use ($product, $data) {
            $this->fill($product, $data);

            // Sellers never publish directly. "published"/"pending" both mean "submit for review".
            if (array_key_exists('status', $data)) {
                $requested = $data['status'];
                if ($requested === 'draft') {
                    $product->status = 'draft';
                } elseif ($product->getOriginal('status') !== 'published') {
                    $product->status = 'pending';
                }
            }

            $imagesChanged = array_key_exists('images', $data) || array_key_exists('image_url', $data);
            $contentChanged = $product->isDirty(self::MODERATED) || $imagesChanged;
            if ($product->getOriginal('status') === 'published' && $product->status === 'published' && $contentChanged) {
                $product->status = 'pending';
            }
            if ($product->status === 'pending') {
                $product->rejection_reason = null;
            }

            $product->save();
            $this->syncImages($product, $data);
            $this->syncVariants($product, $data);
        });

        return response()->json(['data' => $product->fresh(['images', 'variants', 'category', 'brand'])]);
    }

    public function destroy(Request $request, int $id)
    {
        $product = $this->find($request, $id);
        $product->sponsorships()->where('status', 'active')->update(['status' => 'paused']);
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    public function duplicate(Request $request, int $id)
    {
        $source = $this->find($request, $id)->load('images', 'variants');

        $copy = DB::transaction(function () use ($source) {
            $copy = $source->replicate(['rating', 'reviews_count', 'sold_count', 'rejection_reason', 'is_featured']);
            $copy->name = Str::limit($source->name.' (copy)', 180, '');
            $copy->slug = $this->uniqueSlug($copy->name);
            $copy->sku = null;
            $copy->status = 'draft';
            $copy->rating = 0;
            $copy->reviews_count = 0;
            $copy->sold_count = 0;
            $copy->is_featured = false;
            $copy->save();

            foreach ($source->images as $image) {
                $copy->images()->create($image->only(['url', 'is_primary', 'sort_order']));
            }
            foreach ($source->variants as $variant) {
                $copy->variants()->create([...$variant->only(['name', 'price', 'stock', 'attributes']), 'sku' => null]);
            }

            return $copy;
        });

        return response()->json(['data' => $copy->fresh(['images', 'variants', 'category', 'brand'])], 201);
    }

    /** Bulk stock / price update for the inventory screen. */
    public function bulkInventory(Request $request)
    {
        $store = $this->sellerStore($request);
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.id' => ['required', 'integer'],
            'items.*.stock' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'items.*.price' => ['sometimes', 'numeric', 'min:1'],
        ]);

        $updated = 0;
        DB::transaction(function () use ($data, $store, &$updated) {
            foreach ($data['items'] as $row) {
                $product = Product::where('store_id', $store->id)->find($row['id']);
                if (! $product) {
                    continue;
                }
                if (isset($row['stock']) && ! $product->variants()->exists()) {
                    $product->stock = $row['stock'];
                }
                if (isset($row['price'])) {
                    if ($product->compare_at_price && (float) $row['price'] >= (float) $product->compare_at_price) {
                        $product->compare_at_price = null;
                    }
                    $product->price = $row['price'];
                }
                if ($product->isDirty()) {
                    $product->save();
                    $updated++;
                }
            }
        });

        return response()->json(['message' => "{$updated} product(s) updated.", 'data' => ['updated' => $updated]]);
    }

    private function validated(Request $request, ?Product $existing = null): array
    {
        $partial = $existing !== null;
        $required = $partial ? 'sometimes' : 'required';
        $storeId = $this->sellerStore($request)->id;

        $data = $request->validate([
            'name' => [$required, 'string', 'min:3', 'max:180'],
            'description' => ['nullable', 'string', 'max:20000'],
            'key_features' => ['nullable', 'string', 'max:4000'],
            'whats_in_box' => ['nullable', 'string', 'max:2000'],
            'warranty' => ['nullable', 'string', 'max:160'],
            'condition' => ['sometimes', Rule::in(Product::CONDITIONS)],
            'sku' => ['nullable', 'string', 'max:80', Rule::unique('products', 'sku')->where('store_id', $storeId)->ignore($existing?->id)->whereNull('deleted_at')],
            'category_id' => [$required, 'nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'brand_name' => ['nullable', 'string', 'max:120'],
            'price' => [$required, 'numeric', 'min:1', 'max:100000000'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'sale_ends_at' => ['nullable', 'date', 'after:now'],
            'stock' => [$required, 'integer', 'min:0', 'max:100000'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'weight_kg' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'length_cm' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'width_cm' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'height_cm' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'meta_title' => ['nullable', 'string', 'max:160'],
            'meta_description' => ['nullable', 'string', 'max:320'],
            'specs' => ['nullable', 'array', 'max:40'],
            'images' => ['sometimes', 'array', 'max:10'],
            'images.*' => ['string', 'max:500', 'regex:#^(https?://|/)#i'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'variants' => ['sometimes', 'array', 'max:60'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.name' => ['nullable', 'string', 'max:120'],
            'variants.*.sku' => ['nullable', 'string', 'max:80'],
            'variants.*.price' => ['nullable', 'numeric', 'min:1'],
            'variants.*.stock' => ['required_with:variants', 'integer', 'min:0', 'max:100000'],
            'variants.*.attributes' => ['nullable', 'array'],
            'variants.*.attributes.*' => ['nullable', 'string', 'max:60'],
            // Legacy apparel shortcut: sizes × colors.
            'sizes' => ['sometimes', 'array', 'max:20'],
            'sizes.*' => ['string', 'max:40'],
            'colors' => ['sometimes', 'array', 'max:20'],
            'colors.*' => ['string', 'max:40'],
            'status' => ['sometimes', 'in:draft,pending,published'],
        ], [
            'sale_ends_at.after' => 'The sale end date must be in the future.',
            'images.*.regex' => 'Each image must be an uploaded image or an https link.',
            'sku.unique' => 'You already use this SKU on another product.',
        ]);

        $price = (float) ($data['price'] ?? $existing?->price ?? 0);
        if (! empty($data['compare_at_price']) && (float) $data['compare_at_price'] <= $price) {
            throw ValidationException::withMessages([
                'compare_at_price' => ['The original price must be higher than the selling price.'],
            ]);
        }

        if (array_key_exists('category_id', $data) && $data['category_id']) {
            $category = Category::withCount('children')->find($data['category_id']);
            if ($category && $category->children_count > 0) {
                throw ValidationException::withMessages([
                    'category_id' => ['Choose the most specific sub-category for this product.'],
                ]);
            }
        }

        if (isset($data['variants'])) {
            $names = collect($data['variants'])->map(fn ($v) => Str::lower($this->variantName($v)))->filter();
            if ($names->count() !== $names->unique()->count()) {
                throw ValidationException::withMessages(['variants' => ['Each option must be different.']]);
            }
        }

        if (array_key_exists('specs', $data)) {
            $data['specs'] = Product::normalizeSpecs($data['specs']);
        }

        if (! $partial && empty($data['images']) && empty($data['image_url']) && ($data['status'] ?? null) !== 'draft') {
            throw ValidationException::withMessages(['images' => ['Add at least one product photo.']]);
        }

        return $data;
    }

    private function fill(Product $product, array $data): void
    {
        $fields = [
            'name', 'description', 'key_features', 'whats_in_box', 'warranty', 'condition', 'sku', 'category_id',
            'price', 'compare_at_price', 'sale_ends_at', 'stock', 'low_stock_threshold', 'weight_kg', 'length_cm',
            'width_cm', 'height_cm', 'meta_title', 'meta_description', 'specs',
        ];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $product->{$field} = $data[$field];
            }
        }

        if (array_key_exists('brand_name', $data) && ! array_key_exists('brand_id', $data)) {
            $product->brand_id = Brand::resolve($data['brand_name'])?->id;
        } elseif (array_key_exists('brand_id', $data)) {
            $product->brand_id = $data['brand_id'];
        }

        if (array_key_exists('compare_at_price', $data) && empty($data['compare_at_price'])) {
            $product->compare_at_price = null;
            $product->sale_ends_at = null;
        }
    }

    private function syncImages(Product $product, array $data): void
    {
        $urls = $data['images'] ?? (! empty($data['image_url']) ? [$data['image_url']] : null);
        if ($urls === null) {
            return;
        }

        $urls = array_values(array_unique(array_filter($urls)));
        $product->images()->delete();
        foreach ($urls as $i => $url) {
            ProductImage::create([
                'product_id' => $product->id,
                'url' => $url,
                'is_primary' => $i === 0,
                'sort_order' => $i,
            ]);
        }
    }

    private function syncVariants(Product $product, array $data): void
    {
        if (! array_key_exists('variants', $data) && ! array_key_exists('sizes', $data) && ! array_key_exists('colors', $data)) {
            return;
        }

        $rows = $data['variants'] ?? $this->legacyVariants($data, (int) ($data['stock'] ?? $product->stock));
        $keep = [];

        foreach ($rows as $row) {
            $payload = [
                'name' => $this->variantName($row),
                'sku' => $row['sku'] ?? null,
                'price' => $row['price'] ?? null,
                'stock' => (int) ($row['stock'] ?? 0),
                'attributes' => array_filter($row['attributes'] ?? [], fn ($v) => $v !== null && $v !== ''),
            ];

            $variant = ! empty($row['id'])
                ? ProductVariant::where('product_id', $product->id)->find($row['id'])
                : null;

            if ($variant) {
                $variant->update($payload);
            } else {
                $variant = ProductVariant::create(['product_id' => $product->id, ...$payload]);
            }
            $keep[] = $variant->id;
        }

        ProductVariant::where('product_id', $product->id)->whereNotIn('id', $keep ?: [0])->delete();
        $product->syncStockFromVariants();
    }

    /** Sizes × colors → variant rows, splitting stock evenly so totals stay honest. */
    private function legacyVariants(array $data, int $stock): array
    {
        $sizes = array_values(array_filter(array_map('trim', $data['sizes'] ?? [])));
        $colors = array_values(array_filter(array_map('trim', $data['colors'] ?? [])));
        $combos = [];

        if ($sizes && $colors) {
            foreach ($colors as $color) {
                foreach ($sizes as $size) {
                    $combos[] = ['color' => $color, 'size' => $size];
                }
            }
        } else {
            foreach ($sizes ?: $colors as $value) {
                $combos[] = [$sizes ? 'size' : 'color' => $value];
            }
        }

        if (! $combos) {
            return [];
        }

        $each = intdiv($stock, count($combos));
        $remainder = $stock % count($combos);

        return array_map(fn ($attrs, $i) => [
            'attributes' => $attrs,
            'stock' => $each + ($i < $remainder ? 1 : 0),
        ], $combos, array_keys($combos));
    }

    private function variantName(array $row): string
    {
        $name = trim((string) ($row['name'] ?? ''));
        if ($name !== '') {
            return $name;
        }

        return implode(' / ', array_filter(array_map('strval', $row['attributes'] ?? [])));
    }

    private function uniqueSlug(string $name): string
    {
        return (Str::slug($name) ?: 'product').'-'.Str::lower(Str::random(6));
    }

    private function find(Request $request, int $id): Product
    {
        return Product::where('store_id', $this->sellerStore($request)->id)->findOrFail($id);
    }

    private function sellerStore(Request $request): Store
    {
        return $request->user()->store;
    }
}
