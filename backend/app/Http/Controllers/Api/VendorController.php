<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payout;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Sponsorship;
use App\Models\Statement;
use App\Models\Store;
use App\Models\SubOrder;
use App\Services\PaystackService;
use App\Services\SellerScoreService;
use App\Services\SponsorshipService;
use App\Services\StatementService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VendorController extends Controller
{
    public function __construct(
        private PaystackService $paystack,
        private SellerScoreService $scores,
        private StatementService $statements,
        private SponsorshipService $sponsorships,
    ) {}

    public function overview(Request $request)
    {
        $store = $this->storeOrFail($request);
        $this->sponsorships->accrueStore($store);
        $store->setAttribute('seller_score', $this->scores->forStore($store));

        $orders = SubOrder::where('store_id', $store->id)->count();
        $sales = (float) SubOrder::where('store_id', $store->id)
            ->whereIn('status', ['paid', 'processing', 'shipped', 'delivered', 'completed'])
            ->sum('total');
        $products = Product::where('store_id', $store->id)->count();
        $earnings = $this->statements->pending($store);

        return response()->json([
            'data' => [
                'store' => $store,
                'stats' => compact('orders', 'sales', 'products', 'earnings'),
            ],
        ]);
    }

    public function onboarding(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'bio' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:120'],
            'shipping_fee' => ['nullable', 'numeric', 'min:0'],
            'bank_name' => ['nullable', 'string'],
            'account_number' => ['nullable', 'string'],
            'account_name' => ['nullable', 'string'],
        ]);

        $store = $user->store;
        if (! $store) {
            $store = new Store(['user_id' => $user->id]);
            $user->role = 'vendor';
            $user->save();
        }

        $store->fill([
            'name' => $data['name'],
            'slug' => $store->slug ?: Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'bio' => $data['bio'] ?? null,
            'location' => $data['location'] ?? null,
            'shipping_fee' => $data['shipping_fee'] ?? 2500,
            'bank_name' => $data['bank_name'] ?? null,
            'account_number' => $data['account_number'] ?? null,
            'account_name' => $data['account_name'] ?? null,
            'status' => $store->status === 'approved' ? 'approved' : 'pending',
        ]);
        $store->save();

        if ($store->bank_name && $store->account_number && ! $store->paystack_subaccount_code) {
            $result = $this->paystack->createSubaccount([
                'business_name' => $store->name,
                'settlement_bank' => $store->bank_name,
                'account_number' => $store->account_number,
                'percentage_charge' => (float) \App\Models\Setting::getValue('commission_rate', 10),
            ]);
            $code = $result['data']['subaccount_code'] ?? null;
            if ($code) {
                $store->paystack_subaccount_code = $code;
                $store->save();
            }
        }

        return response()->json(['data' => $store->fresh()]);
    }

    public function products(Request $request)
    {
        $store = $this->storeOrFail($request);
        $products = Product::with('images', 'category', 'variants')
            ->where('store_id', $store->id)
            ->latest()
            ->get();

        return response()->json(['data' => $products]);
    }

    public function storeProduct(Request $request)
    {
        $store = $this->storeOrFail($request);
        $data = $this->validateProduct($request);

        $product = Product::create([
            'store_id' => $store->id,
            'category_id' => $data['category_id'] ?? null,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(5)),
            'description' => $data['description'] ?? null,
            'specs' => $data['specs'] ?? null,
            'price' => $data['price'],
            'compare_at_price' => $data['compare_at_price'] ?? null,
            'sale_ends_at' => $data['sale_ends_at'] ?? null,
            'stock' => $data['stock'],
            'status' => 'pending',
        ]);

        if (! empty($data['image_url'])) {
            ProductImage::create([
                'product_id' => $product->id,
                'url' => $data['image_url'],
                'is_primary' => true,
            ]);
        }

        $this->syncVariants($product, $data);

        return response()->json(['data' => $product->load('images', 'variants', 'category')], 201);
    }

    public function updateProduct(Request $request, int $id)
    {
        $store = $this->storeOrFail($request);
        $product = Product::where('store_id', $store->id)->findOrFail($id);
        $data = $this->validateProduct($request, partial: true);

        if (($data['status'] ?? null) === 'published' && $product->status !== 'published') {
            $data['status'] = 'pending';
        }

        unset($data['sizes'], $data['colors'], $data['image_url']);
        $product->update($data);

        if ($request->exists('sizes') || $request->exists('colors')) {
            $product->variants()->delete();
            $this->syncVariants($product, $request->all());
        }

        return response()->json(['data' => $product->fresh('images', 'variants', 'category')]);
    }

    public function orders(Request $request)
    {
        $store = $this->storeOrFail($request);
        $orders = SubOrder::with(['items.product.images', 'order'])
            ->where('store_id', $store->id)
            ->latest()
            ->get();

        return response()->json(['data' => $orders]);
    }

    public function updateOrder(Request $request, int $id)
    {
        $store = $this->storeOrFail($request);
        $subOrder = SubOrder::where('store_id', $store->id)->findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:processing,shipped,delivered,completed,cancelled,returned'],
            'tracking_number' => ['nullable', 'string', 'max:120'],
        ]);

        $status = $data['status'] === 'completed' ? 'delivered' : $data['status'];
        $updates = ['status' => $status];

        if (array_key_exists('tracking_number', $data)) {
            $updates['tracking_number'] = $data['tracking_number'];
        }

        if ($status === 'shipped') {
            $updates['shipped_at'] = $subOrder->shipped_at ?? now();
        }

        if ($status === 'delivered') {
            $updates['shipped_at'] = $subOrder->shipped_at ?? now();
            $updates['delivered_at'] = $subOrder->delivered_at ?? now();
        }

        if ($status === 'returned') {
            $updates['returned_at'] = $subOrder->returned_at ?? now();
        }

        $subOrder->update($updates);

        return response()->json(['data' => $subOrder->fresh('items')]);
    }

    public function earnings(Request $request)
    {
        $store = $this->storeOrFail($request);

        return response()->json(['data' => $this->statementPayload($store)]);
    }

    public function statements(Request $request)
    {
        $store = $this->storeOrFail($request);

        return response()->json(['data' => $this->statementPayload($store)]);
    }

    public function sponsorships(Request $request)
    {
        $store = $this->storeOrFail($request);
        $this->sponsorships->accrueStore($store);

        $rows = Sponsorship::with('product.images')
            ->where('store_id', $store->id)
            ->latest()
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function storeSponsorship(Request $request)
    {
        $store = $this->storeOrFail($request);
        $data = $request->validate([
            'product_id' => ['required', 'integer'],
            'budget' => ['required', 'numeric', 'min:500'],
            'daily_amount' => ['nullable', 'numeric', 'min:100'],
        ]);

        $product = Product::where('store_id', $store->id)
            ->where('status', 'published')
            ->findOrFail($data['product_id']);

        $daily = (float) ($data['daily_amount'] ?? SponsorshipService::DEFAULT_DAILY);
        $daily = min($daily, (float) $data['budget']);

        $sponsorship = Sponsorship::create([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'budget' => $data['budget'],
            'daily_amount' => $daily,
            'spent' => 0,
            'status' => 'active',
        ]);

        $this->sponsorships->accrue($sponsorship->fresh('store'));

        return response()->json(['data' => $sponsorship->fresh('product.images')], 201);
    }

    public function updateSponsorship(Request $request, int $id)
    {
        $store = $this->storeOrFail($request);
        $sponsorship = Sponsorship::where('store_id', $store->id)->findOrFail($id);
        $data = $request->validate([
            'status' => ['required', 'in:active,paused'],
        ]);

        if ($sponsorship->status === 'exhausted') {
            return response()->json(['message' => 'This sponsorship has used its budget.'], 422);
        }

        $sponsorship->update(['status' => $data['status']]);

        return response()->json(['data' => $sponsorship->fresh('product')]);
    }

    public function settings(Request $request)
    {
        $store = $this->storeOrFail($request);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'bio' => ['nullable', 'string'],
            'location' => ['nullable', 'string'],
            'shipping_fee' => ['nullable', 'numeric', 'min:0'],
            'logo' => ['nullable', 'string'],
            'banner' => ['nullable', 'string'],
            'bank_name' => ['nullable', 'string'],
            'account_number' => ['nullable', 'string'],
            'account_name' => ['nullable', 'string'],
        ]);

        $store->update($data);

        return response()->json(['data' => $store->fresh()]);
    }

    private function statementPayload(Store $store): array
    {
        $this->sponsorships->accrueStore($store);
        $summary = $this->statements->summary($store);
        $history = Statement::where('store_id', $store->id)->latest('period_end')->get();
        $paid = (float) Payout::where('store_id', $store->id)->where('status', 'paid')->sum('amount');

        return [
            'pending' => $summary['pending'],
            'available' => $summary['pending'],
            'sales' => $summary['sales'],
            'commission' => $summary['commission'],
            'sponsored_fees' => $summary['sponsored_fees'],
            'paid' => $paid,
            'statements' => $history,
            'payouts' => Payout::where('store_id', $store->id)->latest()->get(),
        ];
    }

    private function validateProduct(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'price' => [$required, 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'sale_ends_at' => ['nullable', 'date'],
            'stock' => [$required, 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'image_url' => ['nullable', 'url'],
            'specs' => ['nullable', 'array'],
            'specs.medium' => ['nullable', 'string', 'max:120'],
            'specs.dimensions' => ['nullable', 'string', 'max:120'],
            'specs.materials' => ['nullable', 'string', 'max:180'],
            'sizes' => ['nullable', 'array'],
            'sizes.*' => ['string', 'max:40'],
            'colors' => ['nullable', 'array'],
            'colors.*' => ['string', 'max:40'],
            'status' => ['sometimes', 'in:draft,pending,published'],
        ]);
    }

    private function syncVariants(Product $product, array $data): void
    {
        $sizes = array_values(array_filter(array_map('trim', $data['sizes'] ?? [])));
        $colors = array_values(array_filter(array_map('trim', $data['colors'] ?? [])));
        $stock = (int) ($data['stock'] ?? $product->stock);

        if ($sizes && $colors) {
            foreach ($colors as $color) {
                foreach ($sizes as $size) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'name' => $color.' / '.$size,
                        'stock' => $stock,
                        'attributes' => ['color' => $color, 'size' => $size],
                    ]);
                }
            }

            return;
        }

        $values = $sizes ?: $colors;
        $key = $sizes ? 'size' : 'color';
        foreach ($values as $value) {
            ProductVariant::create([
                'product_id' => $product->id,
                'name' => $value,
                'stock' => $stock,
                'attributes' => [$key => $value],
            ]);
        }
    }

    private function storeOrFail(Request $request): Store
    {
        $store = $request->user()->store;
        abort_unless($store, 404, 'Vendor store not found');

        return $store;
    }
}
