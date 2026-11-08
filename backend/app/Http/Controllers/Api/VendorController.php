<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Payout;
use App\Models\Store;
use App\Models\SubOrder;
use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VendorController extends Controller
{
    public function __construct(private PaystackService $paystack)
    {
    }

    public function overview(Request $request)
    {
        $store = $this->storeOrFail($request);

        $orders = SubOrder::where('store_id', $store->id)->count();
        $sales = (float) SubOrder::where('store_id', $store->id)->whereIn('status', ['paid', 'processing', 'shipped', 'completed'])->sum('total');
        $products = Product::where('store_id', $store->id)->count();
        $earnings = (float) Payout::where('store_id', $store->id)->where('status', '!=', 'pending')->sum('amount');

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
        $products = Product::with('images', 'category')
            ->where('store_id', $store->id)
            ->latest()
            ->get();

        return response()->json(['data' => $products]);
    }

    public function storeProduct(Request $request)
    {
        $store = $this->storeOrFail($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'image_url' => ['nullable', 'url'],
        ]);

        $product = Product::create([
            'store_id' => $store->id,
            'category_id' => $data['category_id'] ?? null,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(5)),
            'description' => $data['description'] ?? null,
            'price' => $data['price'],
            'compare_at_price' => $data['compare_at_price'] ?? null,
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

        return response()->json(['data' => $product->load('images')], 201);
    }

    public function updateProduct(Request $request, int $id)
    {
        $store = $this->storeOrFail($request);
        $product = Product::where('store_id', $store->id)->findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'status' => ['sometimes', 'in:draft,pending,published'],
        ]);

        if (($data['status'] ?? null) === 'published' && $product->status !== 'published') {
            $data['status'] = 'pending';
        }

        $product->update($data);

        return response()->json(['data' => $product->fresh('images')]);
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
            'status' => ['required', 'in:processing,shipped,completed,cancelled'],
            'tracking_number' => ['nullable', 'string', 'max:120'],
        ]);

        $subOrder->update($data);

        return response()->json(['data' => $subOrder->fresh('items')]);
    }

    public function earnings(Request $request)
    {
        $store = $this->storeOrFail($request);
        $payouts = Payout::with('subOrder')
            ->where('store_id', $store->id)
            ->latest()
            ->get();

        return response()->json([
            'data' => [
                'available' => (float) $payouts->where('status', 'available')->sum('amount'),
                'paid' => (float) $payouts->where('status', 'paid')->sum('amount'),
                'payouts' => $payouts,
            ],
        ]);
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

    private function storeOrFail(Request $request): Store
    {
        $store = $request->user()->store;
        abort_unless($store, 404, 'Vendor store not found');

        return $store;
    }
}
