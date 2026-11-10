<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VendorStatusMail;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Statement;
use App\Models\Store;
use App\Models\User;
use App\Services\SponsorshipService;
use App\Services\StatementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function overview()
    {
        return response()->json([
            'data' => [
                'gmv' => (float) Order::where('payment_status', 'paid')->sum('total'),
                'orders' => Order::count(),
                'vendors' => Store::where('status', 'approved')->count(),
                'customers' => User::where('role', 'customer')->count(),
                'pending_vendors' => Store::where('status', 'pending')->count(),
                'pending_products' => Product::where('status', 'pending')->count(),
            ],
        ]);
    }

    public function vendors()
    {
        return response()->json([
            'data' => Store::with('user')->latest()->get(),
        ]);
    }

    public function updateVendor(Request $request, int $id)
    {
        $store = Store::with('user')->findOrFail($id);
        $data = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected,suspended'],
        ]);
        $store->update($data);
        $store = $store->fresh('user');

        if ($store->user?->email && in_array($data['status'], ['approved', 'rejected', 'suspended'], true)) {
            try {
                Mail::to($store->user->email)->send(new VendorStatusMail($store, $data['status']));
            } catch (\Throwable) {
                //
            }
        }

        return response()->json(['data' => $store]);
    }

    public function products()
    {
        return response()->json([
            'data' => Product::with(['store', 'images', 'category'])->latest()->get(),
        ]);
    }

    public function updateProduct(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $data = $request->validate([
            'status' => ['required', 'in:draft,pending,published,rejected'],
            'is_featured' => ['sometimes', 'boolean'],
        ]);
        $product->update($data);

        return response()->json(['data' => $product->fresh()]);
    }

    public function orders()
    {
        return response()->json([
            'data' => Order::with(['user', 'subOrders.store'])->latest()->get(),
        ]);
    }

    public function categories()
    {
        return response()->json(['data' => Category::orderBy('sort_order')->get()]);
    }

    public function storeCategory(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        $category = Category::create([
            ...$data,
            'slug' => Str::slug($data['name']),
            'sort_order' => Category::count() + 1,
        ]);

        return response()->json(['data' => $category], 201);
    }

    public function banners()
    {
        return response()->json(['data' => Banner::orderBy('sort_order')->get()]);
    }

    public function storeBanner(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string'],
            'subtitle' => ['nullable', 'string'],
            'image' => ['required', 'string'],
            'cta_label' => ['nullable', 'string'],
            'cta_url' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $banner = Banner::create([
            ...$data,
            'sort_order' => Banner::count() + 1,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $banner], 201);
    }

    public function updateBanner(Request $request, int $id)
    {
        $banner = Banner::findOrFail($id);
        $banner->update($request->validate([
            'title' => ['sometimes', 'string'],
            'subtitle' => ['nullable', 'string'],
            'image' => ['sometimes', 'string'],
            'cta_label' => ['nullable', 'string'],
            'cta_url' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
        ]));

        return response()->json(['data' => $banner]);
    }

    public function payouts()
    {
        return response()->json([
            'data' => Payout::with(['store', 'subOrder'])->latest()->get(),
        ]);
    }

    public function updatePayout(Request $request, int $id)
    {
        $payout = Payout::findOrFail($id);
        $data = $request->validate([
            'status' => ['required', 'in:pending,available,paid,failed'],
            'reference' => ['nullable', 'string'],
        ]);
        $payout->update($data);

        if ($payout->statement_id && $data['status'] === 'paid') {
            Statement::where('id', $payout->statement_id)->update(['status' => 'paid']);
        }

        return response()->json(['data' => $payout]);
    }

    public function closeStatements(StatementService $statements, SponsorshipService $sponsorships)
    {
        $sponsorships->accrueAll();
        $created = $statements->closeOpenBalances();

        return response()->json([
            'data' => Statement::with('store')->whereIn('id', collect($created)->pluck('id'))->get(),
        ]);
    }

    public function settings(Request $request)
    {
        if ($request->isMethod('get')) {
            return response()->json([
                'data' => [
                    'commission_rate' => (float) Setting::getValue('commission_rate', 10),
                ],
            ]);
        }

        $data = $request->validate([
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:50'],
        ]);

        Setting::updateOrCreate(
            ['key' => 'commission_rate'],
            ['value' => (string) $data['commission_rate']]
        );

        return response()->json([
            'data' => ['commission_rate' => (float) $data['commission_rate']],
        ]);
    }
}
