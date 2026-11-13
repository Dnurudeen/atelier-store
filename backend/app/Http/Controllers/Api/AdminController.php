<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VendorStatusMail;
use App\Models\AdminAction;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\InboxNotification;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\Review;
use App\Models\Setting;
use App\Models\Statement;
use App\Models\Store;
use App\Models\SubOrder;
use App\Models\User;
use App\Services\OrderService;
use App\Services\ReturnService;
use App\Services\SellerScoreService;
use App\Services\SponsorshipService;
use App\Services\StatementService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin console API. Every write is recorded in admin_actions.
 */
class AdminController extends Controller
{
    private const URL_RULE = 'regex:#^(https?://|/)#i';

    public function __construct(private OrderService $orders) {}

    // ---------------------------------------------------------------- Overview

    public function overview()
    {
        $paid = fn () => Order::where('payment_status', 'paid');
        $since = now()->subDays(29)->startOfDay();

        $daily = $paid()->where('created_at', '>=', $since)->get(['total', 'created_at'])
            ->groupBy(fn ($o) => $o->created_at->toDateString())
            ->map(fn ($rows) => ['gmv' => round((float) $rows->sum('total'), 2), 'orders' => $rows->count()]);
        $series = collect(range(0, 29))->map(function ($i) use ($since, $daily) {
            $day = $since->copy()->addDays($i)->toDateString();

            return ['date' => $day, 'gmv' => $daily[$day]['gmv'] ?? 0, 'orders' => $daily[$day]['orders'] ?? 0];
        });

        return response()->json([
            'data' => [
                'gmv' => (float) $paid()->sum('total'),
                'gmv_30d' => (float) $paid()->where('created_at', '>=', $since)->sum('total'),
                'commission' => (float) SubOrder::whereHas('order', fn ($q) => $q->where('payment_status', 'paid'))
                    ->whereNotIn('status', ['cancelled', 'returned'])->sum('commission'),
                'orders' => Order::count(),
                'paid_orders' => $paid()->count(),
                'vendors' => Store::where('status', 'approved')->count(),
                'customers' => User::where('role', 'customer')->count(),
                'new_customers_30d' => User::where('role', 'customer')->where('created_at', '>=', $since)->count(),
                'products_live' => Product::where('status', 'published')->count(),
                'pending_vendors' => Store::where('status', 'pending')->count(),
                'pending_products' => Product::where('status', 'pending')->count(),
                'escalated_returns' => ReturnRequest::where('status', 'escalated')->count(),
                'refunds_due' => SubOrder::where('refund_status', 'pending')->count() + ReturnRequest::where('refund_status', 'pending')->count(),
                'pending_payouts' => Payout::whereIn('status', ['pending', 'available'])->count(),
                'open_messages' => DB::table('contact_messages')->where('status', 'open')->count(),
                'series' => $series,
                'recent_orders' => Order::with('user:id,name')->latest()->limit(8)->get(['id', 'order_number', 'user_id', 'status', 'payment_status', 'total', 'created_at']),
            ],
        ]);
    }

    // ---------------------------------------------------------------- Users

    public function users(Request $request)
    {
        $query = User::query()
            ->withCount('orders')
            ->withSum(['orders as total_spent' => fn ($q) => $q->where('payment_status', 'paid')], 'total')
            ->latest();

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q = $this->like($request->string('q'));
            $query->where(fn ($b) => $b->where('name', 'like', $q)->orWhere('email', 'like', $q)->orWhere('phone', 'like', $q));
        }

        return $this->paginated($query->paginate($this->perPage($request)));
    }

    public function user(int $id)
    {
        $user = User::with('store')->withCount('orders')->findOrFail($id);
        $user->store?->withPrivateDetails();

        return response()->json([
            'data' => [
                ...AuthController::transformUser($user),
                'orders_count' => $user->orders_count,
                'total_spent' => (float) Order::where('user_id', $user->id)->where('payment_status', 'paid')->sum('total'),
                'last_login_at' => $user->last_login_at,
                'recent_orders' => Order::where('user_id', $user->id)->latest()->limit(10)->get(['id', 'order_number', 'status', 'payment_status', 'total', 'created_at']),
            ],
        ]);
    }

    public function updateUser(Request $request, int $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'role' => ['sometimes', 'in:customer,vendor,admin'],
            'status' => ['sometimes', 'in:active,suspended'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages(['user' => ['You cannot change your own role or status.']]);
        }
        if ($user->status === 'deleted') {
            throw ValidationException::withMessages(['user' => ['This account has been closed.']]);
        }
        if (($data['role'] ?? null) === 'vendor' && ! $user->store()->exists()) {
            throw ValidationException::withMessages(['role' => ['This user has no store. Ask them to apply via “Sell on Atelier”.']]);
        }

        $before = $user->only(['role', 'status']);
        $user->fill(collect($data)->only(['role', 'status'])->all())->save();

        if (($data['status'] ?? null) === 'suspended') {
            $user->tokens()->delete(); // sign them out everywhere
        }

        $this->audit($request, 'user.updated', $user, ['before' => $before, 'after' => $user->only(['role', 'status']), 'reason' => $data['reason'] ?? null]);

        return response()->json(['data' => AuthController::transformUser($user->fresh('store'))]);
    }

    // ---------------------------------------------------------------- Vendors

    public function vendors(Request $request)
    {
        $query = Store::with('user:id,name,email,phone')
            ->withCount(['products', 'products as live_products_count' => fn ($q) => $q->where('status', 'published')])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q = $this->like($request->string('q'));
            $query->where(fn ($b) => $b->where('name', 'like', $q)->orWhereHas('user', fn ($u) => $u->where('email', 'like', $q)));
        }

        $page = $query->paginate($this->perPage($request));
        $page->getCollection()->each->withPrivateDetails();

        return $this->paginated($page, [
            'counts' => Store::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function vendor(int $id, SellerScoreService $scores, StatementService $statements)
    {
        $store = Store::with('user:id,name,email,phone,created_at')
            ->withCount(['products', 'products as live_products_count' => fn ($q) => $q->where('status', 'published'), 'followers'])
            ->findOrFail($id)
            ->withPrivateDetails();

        $paidSubs = SubOrder::where('store_id', $store->id)->whereHas('order', fn ($q) => $q->where('payment_status', 'paid'));

        return response()->json([
            'data' => [
                'store' => $store,
                'seller_score' => $scores->forStore($store),
                'sales' => (float) (clone $paidSubs)->whereNotIn('status', ['cancelled', 'returned'])->sum('subtotal'),
                'orders' => (clone $paidSubs)->count(),
                'pending_balance' => $statements->pending($store),
                'recent_products' => Product::with('images')->where('store_id', $store->id)->latest()->limit(8)->get(['id', 'name', 'slug', 'status', 'price', 'stock']),
                'history' => AdminAction::with('user:id,name')->where('subject_type', 'Store')->where('subject_id', $store->id)->latest()->limit(20)->get(),
            ],
        ]);
    }

    public function updateVendor(Request $request, int $id)
    {
        $store = Store::with('user')->findOrFail($id);
        $data = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected,suspended'],
            'reason' => ['nullable', 'required_if:status,rejected,suspended', 'string', 'max:255'],
        ], ['reason.required_if' => 'Give the seller a reason so they know what to fix.']);

        $before = $store->status;
        $store->update([
            'status' => $data['status'],
            'status_reason' => $data['status'] === 'approved' ? null : ($data['reason'] ?? null),
        ]);
        $store = $store->fresh('user')->withPrivateDetails();

        if ($store->user && $before !== $data['status']) {
            $messages = [
                'approved' => ['Your store is approved 🎉', 'You can now publish products and start selling.'],
                'rejected' => ['Store application not approved', $data['reason'] ?? ''],
                'suspended' => ['Your store has been suspended', $data['reason'] ?? ''],
                'pending' => ['Your store is back under review', ''],
            ];
            InboxNotification::notify($store->user->id, 'store', $messages[$data['status']][0], $messages[$data['status']][1], '/vendor');

            if (in_array($data['status'], ['approved', 'rejected', 'suspended'], true) && $store->user->email) {
                try {
                    Mail::to($store->user->email)->send(new VendorStatusMail($store, $data['status']));
                } catch (\Throwable $e) {
                    Log::warning('Vendor status mail failed', ['store' => $store->id, 'error' => $e->getMessage()]);
                }
            }
        }

        $this->audit($request, 'vendor.'.$data['status'], $store, ['from' => $before, 'reason' => $data['reason'] ?? null]);

        return response()->json(['data' => $store]);
    }

    // ---------------------------------------------------------------- Products

    public function products(Request $request)
    {
        $query = Product::with(['store:id,name,slug', 'images', 'category:id,name', 'brand:id,name'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('store')) {
            $query->where('store_id', (int) $request->input('store'));
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }
        if ($request->filled('q')) {
            $q = $this->like($request->string('q'));
            $query->where(fn ($b) => $b->where('name', 'like', $q)->orWhere('sku', 'like', $q));
        }

        return $this->paginated($query->paginate($this->perPage($request)), [
            'counts' => Product::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function product(int $id)
    {
        return response()->json([
            'data' => Product::withTrashed()
                ->with(['store:id,name,slug,status', 'images', 'variants', 'category.parent', 'brand'])
                ->findOrFail($id),
        ]);
    }

    public function updateProduct(Request $request, int $id)
    {
        $product = Product::with('store')->findOrFail($id);
        $data = $request->validate([
            'status' => ['sometimes', 'in:draft,pending,published,rejected'],
            'is_featured' => ['sometimes', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        if (($data['status'] ?? null) === 'rejected' && empty($data['reason'])) {
            throw ValidationException::withMessages(['reason' => ['Tell the seller why the product was rejected.']]);
        }

        $before = $product->status;
        if (array_key_exists('status', $data)) {
            $product->status = $data['status'];
            $product->rejection_reason = $data['status'] === 'rejected' ? $data['reason'] : null;
        }
        if (array_key_exists('is_featured', $data)) {
            $product->is_featured = $data['is_featured'];
        }
        $product->save();

        if (isset($data['status']) && $data['status'] !== $before && in_array($data['status'], ['published', 'rejected'], true)) {
            InboxNotification::notify(
                $product->store?->user_id,
                'product',
                $data['status'] === 'published' ? 'Product approved' : 'Product needs changes',
                $data['status'] === 'published' ? "“{$product->name}” is now live." : "“{$product->name}”: {$data['reason']}",
                '/vendor/products/'.$product->id
            );
        }

        $this->audit($request, 'product.updated', $product, ['from' => $before, 'to' => $product->status, 'featured' => $product->is_featured, 'reason' => $data['reason'] ?? null]);

        return response()->json(['data' => $product->fresh(['store:id,name,slug', 'images'])]);
    }

    public function destroyProduct(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $product->sponsorships()->where('status', 'active')->update(['status' => 'paused']);
        $product->delete();
        $this->audit($request, 'product.deleted', $product, ['name' => $product->name]);

        return response()->json(['message' => 'Product removed from the marketplace.']);
    }

    // ---------------------------------------------------------------- Orders

    public function orders(Request $request)
    {
        $query = Order::with(['user:id,name,email', 'subOrders.store:id,name'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('payment')) {
            $query->where('payment_status', $request->string('payment'));
        }
        if ($request->boolean('refunds')) {
            $query->whereHas('subOrders', fn ($s) => $s->where('refund_status', 'pending'));
        }
        if ($request->filled('q')) {
            $q = $this->like($request->string('q'));
            $query->where(fn ($b) => $b->where('order_number', 'like', $q)
                ->orWhere('paystack_reference', 'like', $q)
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', $q)->orWhere('name', 'like', $q)));
        }

        return $this->paginated($query->paginate($this->perPage($request)));
    }

    public function order(int $id)
    {
        $order = Order::with([
            'user:id,name,email,phone',
            'payment',
            'subOrders.store:id,name,slug',
            'subOrders.items.product:id,slug',
            'subOrders.returns',
        ])->findOrFail($id);

        return response()->json(['data' => $order]);
    }

    public function updateSubOrder(Request $request, int $id)
    {
        $sub = SubOrder::findOrFail($id);
        $data = $request->validate([
            'status' => ['sometimes', 'in:processing,shipped,delivered,cancelled,returned'],
            'tracking_number' => ['nullable', 'string', 'max:120'],
            'reason' => ['nullable', 'string', 'max:255'],
            'refund_status' => ['sometimes', 'in:refunded'],
            'refund_reference' => ['nullable', 'string', 'max:120'],
        ]);

        if (isset($data['status'])) {
            $sub = $this->orders->transition($sub, $data['status'], 'admin', [
                'tracking_number' => $data['tracking_number'] ?? null,
                'reason' => $data['reason'] ?? null,
            ]);
        }

        if (($data['refund_status'] ?? null) === 'refunded') {
            if ($sub->refund_status !== 'pending') {
                throw ValidationException::withMessages(['refund_status' => ['No refund is due on this package.']]);
            }
            $sub->update(['refund_status' => 'refunded']);
            $sub->loadMissing('order');
            InboxNotification::notify($sub->order?->user_id, 'order', 'Refund sent', 'We refunded ₦'.number_format((float) $sub->total).' for order '.$sub->order?->order_number.'. It can take 5–10 business days to show.', '/account/orders/'.$sub->order_id);
        }

        $this->audit($request, 'order.updated', $sub, collect($data)->except('tracking_number')->all());

        return response()->json(['data' => $sub->fresh(['items', 'store:id,name'])]);
    }

    // ---------------------------------------------------------------- Returns

    public function returns(Request $request)
    {
        $query = ReturnRequest::with(['item', 'user:id,name,email', 'store:id,name,slug', 'subOrder.order:id,order_number'])->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->boolean('refunds')) {
            $query->where('refund_status', 'pending');
        }

        return $this->paginated($query->paginate($this->perPage($request)));
    }

    public function updateReturn(Request $request, int $id, ReturnService $returns)
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approve,refund,reject,refunded'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $return = ReturnRequest::findOrFail($id);

        if ($data['decision'] === 'refunded') {
            if ($return->refund_status !== 'pending') {
                throw ValidationException::withMessages(['decision' => ['No refund is due on this return.']]);
            }
            $return->update(['refund_status' => 'refunded']);
            InboxNotification::notify($return->user_id, 'return', 'Refund sent', 'Your refund of ₦'.number_format((float) $return->refund_amount).' has been sent.', '/account/returns');
        } else {
            $return = $returns->adminResolve($return, $data['decision'], $data['note'] ?? null);
        }

        $this->audit($request, 'return.'.$data['decision'], $return, ['note' => $data['note'] ?? null]);

        return response()->json(['data' => $return->fresh(['item'])]);
    }

    // ---------------------------------------------------------------- Categories

    public function categories()
    {
        return response()->json([
            'data' => Category::withCount(['products', 'children'])->orderBy('parent_id')->orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    public function storeCategory(Request $request)
    {
        $data = $request->validate($this->categoryRules());

        $category = Category::create([
            ...$data,
            'slug' => $this->uniqueSlug(Category::class, $data['name']),
            'sort_order' => $data['sort_order'] ?? Category::count() + 1,
            'is_active' => $data['is_active'] ?? true,
        ]);
        $this->audit($request, 'category.created', $category);

        return response()->json(['data' => $category], 201);
    }

    public function updateCategory(Request $request, int $id)
    {
        $category = Category::findOrFail($id);
        $data = $request->validate($this->categoryRules(partial: true));

        if (! empty($data['parent_id'])) {
            if ((int) $data['parent_id'] === $category->id) {
                throw ValidationException::withMessages(['parent_id' => ['A category cannot be its own parent.']]);
            }
            if ($category->children()->exists()) {
                throw ValidationException::withMessages(['parent_id' => ['Move this category\'s sub-categories first — we support two levels.']]);
            }
            if (Category::find($data['parent_id'])?->parent_id) {
                throw ValidationException::withMessages(['parent_id' => ['Choose a top-level category as the parent.']]);
            }
        }

        $category->update($data);
        $this->audit($request, 'category.updated', $category, $data);

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroyCategory(Request $request, int $id)
    {
        $category = Category::withCount(['products', 'children'])->findOrFail($id);
        if ($category->products_count > 0 || $category->children_count > 0) {
            throw ValidationException::withMessages(['category' => ['Only empty categories can be deleted. Hide it instead, or move its products first.']]);
        }
        $category->delete();
        $this->audit($request, 'category.deleted', $category, ['name' => $category->name]);

        return response()->json(['message' => 'Category deleted.']);
    }

    // ---------------------------------------------------------------- Brands

    public function brands(Request $request)
    {
        $query = Brand::withCount('products')->orderBy('name');
        if ($request->filled('q')) {
            $query->where('name', 'like', $this->like($request->string('q')));
        }

        return $this->paginated($query->paginate($this->perPage($request, 50)));
    }

    public function storeBrand(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('brands', 'name')],
            'logo' => ['nullable', 'string', 'max:500', self::URL_RULE],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $brand = Brand::create([...$data, 'slug' => $this->uniqueSlug(Brand::class, $data['name'])]);
        $this->audit($request, 'brand.created', $brand);

        return response()->json(['data' => $brand], 201);
    }

    public function updateBrand(Request $request, int $id)
    {
        $brand = Brand::findOrFail($id);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120', Rule::unique('brands', 'name')->ignore($brand->id)],
            'logo' => ['nullable', 'string', 'max:500', self::URL_RULE],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $brand->update($data);
        $this->audit($request, 'brand.updated', $brand, $data);

        return response()->json(['data' => $brand->fresh()]);
    }

    public function destroyBrand(Request $request, int $id)
    {
        $brand = Brand::withCount('products')->findOrFail($id);
        if ($brand->products_count > 0) {
            throw ValidationException::withMessages(['brand' => ['This brand is used by products. Hide it instead.']]);
        }
        $brand->delete();
        $this->audit($request, 'brand.deleted', $brand, ['name' => $brand->name]);

        return response()->json(['message' => 'Brand deleted.']);
    }

    // ---------------------------------------------------------------- Vouchers

    public function coupons(Request $request)
    {
        $query = Coupon::with(['store:id,name', 'category:id,name'])->latest();
        if ($request->filled('q')) {
            $query->where('code', 'like', $this->like(strtoupper((string) $request->string('q'))));
        }

        return $this->paginated($query->paginate($this->perPage($request)));
    }

    public function storeCoupon(Request $request)
    {
        $data = $this->validateCoupon($request);
        $coupon = Coupon::create($data);
        $this->audit($request, 'coupon.created', $coupon, ['code' => $coupon->code]);

        return response()->json(['data' => $coupon], 201);
    }

    public function updateCoupon(Request $request, int $id)
    {
        $coupon = Coupon::findOrFail($id);
        $data = $this->validateCoupon($request, $coupon);
        $coupon->update($data);
        $this->audit($request, 'coupon.updated', $coupon, $data);

        return response()->json(['data' => $coupon->fresh(['store:id,name', 'category:id,name'])]);
    }

    public function destroyCoupon(Request $request, int $id)
    {
        $coupon = Coupon::findOrFail($id);
        if ($coupon->redemptions()->exists()) {
            $coupon->update(['is_active' => false]);
            $this->audit($request, 'coupon.deactivated', $coupon);

            return response()->json(['message' => 'This voucher has been used, so it was deactivated instead of deleted.']);
        }
        $coupon->delete();
        $this->audit($request, 'coupon.deleted', $coupon, ['code' => $coupon->code]);

        return response()->json(['message' => 'Voucher deleted.']);
    }

    // ---------------------------------------------------------------- Banners

    public function banners()
    {
        return response()->json(['data' => Banner::orderBy('placement')->orderBy('sort_order')->get()]);
    }

    public function storeBanner(Request $request)
    {
        $data = $request->validate($this->bannerRules());
        $banner = Banner::create([
            ...$data,
            'placement' => $data['placement'] ?? 'hero',
            'sort_order' => $data['sort_order'] ?? Banner::count() + 1,
            'is_active' => $data['is_active'] ?? true,
        ]);
        $this->audit($request, 'banner.created', $banner);

        return response()->json(['data' => $banner], 201);
    }

    public function updateBanner(Request $request, int $id)
    {
        $banner = Banner::findOrFail($id);
        $banner->update($request->validate($this->bannerRules(partial: true)));
        $this->audit($request, 'banner.updated', $banner);

        return response()->json(['data' => $banner]);
    }

    public function destroyBanner(Request $request, int $id)
    {
        $banner = Banner::findOrFail($id);
        $banner->delete();
        $this->audit($request, 'banner.deleted', $banner, ['title' => $banner->title]);

        return response()->json(['message' => 'Banner deleted.']);
    }

    // ---------------------------------------------------------------- Reviews

    public function reviews(Request $request)
    {
        $query = Review::with(['user:id,name,email', 'product:id,name,slug'])->latest();
        if ($request->filled('hidden')) {
            $query->where('is_hidden', $request->boolean('hidden'));
        }
        if ($request->filled('rating')) {
            $query->where('rating', '<=', (int) $request->input('rating'));
        }

        return $this->paginated($query->paginate($this->perPage($request)));
    }

    public function updateReview(Request $request, int $id)
    {
        $review = Review::with('product.store')->findOrFail($id);
        $data = $request->validate(['is_hidden' => ['required', 'boolean']]);
        $review->update($data);
        AccountController::refreshRatings($review->product);
        $this->audit($request, $data['is_hidden'] ? 'review.hidden' : 'review.restored', $review);

        return response()->json(['data' => $review->fresh(['user:id,name', 'product:id,name,slug'])]);
    }

    // ---------------------------------------------------------------- Payouts & statements

    public function payouts(Request $request)
    {
        $query = Payout::with(['store', 'statement'])->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        $rows = $query->limit(300)->get()->each(fn ($p) => $p->store?->withPrivateDetails());

        return response()->json(['data' => $rows]);
    }

    public function updatePayout(Request $request, int $id)
    {
        $payout = Payout::findOrFail($id);
        $data = $request->validate([
            'status' => ['required', 'in:pending,available,paid,failed'],
            'reference' => ['required_if:status,paid', 'nullable', 'string', 'max:120'],
        ]);
        if ($payout->status === 'paid') {
            return response()->json(['message' => 'This payout has already been paid.'], 422);
        }
        $payout->update($data);

        if ($payout->statement_id && $data['status'] === 'paid') {
            Statement::where('id', $payout->statement_id)->update(['status' => 'paid']);
            InboxNotification::notify($payout->store?->user_id, 'payout', 'Payout sent', '₦'.number_format((float) $payout->amount).' was sent to your bank account (ref '.$data['reference'].').', '/vendor/statements');
        }
        $this->audit($request, 'payout.'.$data['status'], $payout, ['reference' => $data['reference'] ?? null]);

        return response()->json(['data' => $payout]);
    }

    public function closeStatements(Request $request, StatementService $statements, SponsorshipService $sponsorships)
    {
        $sponsorships->accrueAll();
        $created = $statements->closeOpenBalances();
        $this->audit($request, 'statements.closed', null, ['count' => count($created)]);

        return response()->json([
            'data' => Statement::with('store')->whereIn('id', collect($created)->pluck('id'))->get(),
        ]);
    }

    // ---------------------------------------------------------------- Support inbox, newsletter, audit

    public function messages(Request $request)
    {
        $query = DB::table('contact_messages')->orderByDesc('id');
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return $this->paginated($query->paginate($this->perPage($request)));
    }

    public function updateMessage(Request $request, int $id)
    {
        $data = $request->validate(['status' => ['required', 'in:open,closed']]);
        $updated = DB::table('contact_messages')->where('id', $id)->update(['status' => $data['status'], 'updated_at' => now()]);
        abort_unless($updated, 404);
        $this->audit($request, 'message.'.$data['status'], null, ['message_id' => $id]);

        return response()->json(['data' => DB::table('contact_messages')->find($id)]);
    }

    public function subscribers(Request $request)
    {
        return $this->paginated(
            DB::table('newsletter_subscribers')->whereNull('unsubscribed_at')->orderByDesc('id')->paginate($this->perPage($request, 50))
        );
    }

    public function audits(Request $request)
    {
        $query = AdminAction::with('user:id,name')->latest();
        if ($request->filled('action')) {
            $query->where('action', 'like', $this->like($request->string('action')));
        }

        return $this->paginated($query->paginate($this->perPage($request, 50)));
    }

    // ---------------------------------------------------------------- Settings

    public const SETTINGS = [
        'commission_rate' => ['numeric', 'min:0', 'max:50'],
        'support_email' => ['nullable', 'email', 'max:190'],
        'support_phone' => ['nullable', 'string', 'max:30'],
        'announcement' => ['nullable', 'string', 'max:160'],
    ];

    public function settings(Request $request)
    {
        if ($request->isMethod('get')) {
            return response()->json(['data' => $this->settingsPayload()]);
        }

        $rules = collect(self::SETTINGS)->map(fn ($r) => ['sometimes', ...$r])->all();
        $data = $request->validate($rules);
        foreach ($data as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value === null ? null : (string) $value]);
        }
        $this->audit($request, 'settings.updated', null, $data);

        return response()->json(['data' => $this->settingsPayload()]);
    }

    private function settingsPayload(): array
    {
        return [
            'commission_rate' => (float) Setting::getValue('commission_rate', 10),
            'support_email' => Setting::getValue('support_email'),
            'support_phone' => Setting::getValue('support_phone'),
            'announcement' => Setting::getValue('announcement'),
        ];
    }

    // ---------------------------------------------------------------- Helpers

    private function validateCoupon(Request $request, ?Coupon $existing = null): array
    {
        $partial = $existing !== null;
        $req = $partial ? 'sometimes' : 'required';
        $request->merge($request->has('code') ? ['code' => strtoupper(trim((string) $request->input('code')))] : []);

        $data = $request->validate([
            'code' => [$req, 'string', 'min:3', 'max:40', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('coupons', 'code')->ignore($existing?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'type' => [$req, 'in:percent,fixed,free_shipping'],
            'value' => [$req, 'numeric', 'min:0'],
            'min_order' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'first_order_only' => ['sometimes', 'boolean'],
            'is_public' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ], ['code.regex' => 'Use capital letters, numbers, dashes or underscores only.']);

        $type = $data['type'] ?? $existing?->type;
        $value = (float) ($data['value'] ?? $existing?->value ?? 0);
        if ($type === 'percent' && ($value <= 0 || $value > 90)) {
            throw ValidationException::withMessages(['value' => ['Percentage vouchers must be between 1 and 90%.']]);
        }
        if ($type === 'fixed' && $value <= 0) {
            throw ValidationException::withMessages(['value' => ['Enter the amount to take off.']]);
        }

        return $data;
    }

    private function categoryRules(bool $partial = false): array
    {
        return [
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image' => ['nullable', 'string', 'max:500', self::URL_RULE],
            'icon' => ['nullable', 'string', 'max:60'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    private function bannerRules(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'title' => [$req, 'string', 'max:160'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image' => [$req, 'string', 'max:500', self::URL_RULE],
            'cta_label' => ['nullable', 'string', 'max:60'],
            'cta_url' => ['nullable', 'string', 'max:500', self::URL_RULE],
            'placement' => ['sometimes', 'in:hero,side,tile'],
            'background' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ];
    }

    private function uniqueSlug(string $model, string $name): string
    {
        $base = Str::slug($name) ?: 'item';
        $slug = $base;
        $n = 2;
        while ($model::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }

    private function like(mixed $term): string
    {
        return '%'.str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], (string) $term).'%';
    }

    private function perPage(Request $request, int $default = 25): int
    {
        return max(1, min((int) $request->input('per_page', $default), 100));
    }

    private function paginated(LengthAwarePaginator $page, array $extra = [])
    {
        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                ...$extra,
            ],
        ]);
    }

    private function audit(Request $request, string $action, $subject = null, array $meta = []): void
    {
        AdminAction::record($request->user(), $action, $subject, array_filter($meta, fn ($v) => $v !== null));
    }
}
