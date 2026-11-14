<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\InboxNotification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\Review;
use App\Models\Store;
use App\Models\SubOrder;
use App\Models\Wishlist;
use App\Services\OrderService;
use App\Services\ReturnService;
use App\Support\OrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    private const ORDER_TABS = [
        'ongoing' => ['pending', 'processing', 'shipped'],
        'delivered' => ['delivered'],
        'cancelled' => ['cancelled', 'returned', 'expired'],
    ];

    public function __construct(
        private OrderService $orderService,
        private ReturnService $returns,
    ) {}

    public function overview(Request $request)
    {
        $user = $request->user();
        $orders = Order::where('user_id', $user->id);

        return response()->json([
            'data' => [
                'user' => AuthController::transformUser($user->load('store')),
                'counts' => [
                    'orders' => (clone $orders)->where('payment_status', '!=', 'abandoned')->count(),
                    'ongoing' => (clone $orders)->whereIn('status', self::ORDER_TABS['ongoing'])->where('payment_status', 'paid')->count(),
                    'wishlist' => Wishlist::where('user_id', $user->id)->count(),
                    'unread' => InboxNotification::where('user_id', $user->id)->whereNull('read_at')->count(),
                    'pending_reviews' => $this->pendingReviewsQuery($user->id)->count(),
                    'vouchers' => $this->availableVouchersQuery()->count(),
                    'following' => $user->followedStores()->count(),
                ],
                'total_spent' => (float) (clone $orders)->where('payment_status', 'paid')->sum('total'),
                'default_address' => Address::where('user_id', $user->id)->orderByDesc('is_default')->latest()->first(),
                'recent_orders' => (clone $orders)
                    ->where('payment_status', '!=', 'abandoned')
                    ->with(['subOrders.items.product:id,slug', 'subOrders.items.product.images'])
                    ->latest()
                    ->limit(3)
                    ->get(),
            ],
        ]);
    }

    public function orders(Request $request)
    {
        $query = Order::with(['subOrders.store:id,name,slug', 'subOrders.items.product:id,slug', 'subOrders.items.product.images'])
            ->where('user_id', $request->user()->id)
            ->latest();

        $tab = $request->string('status')->toString();
        if (isset(self::ORDER_TABS[$tab])) {
            $query->whereIn('status', self::ORDER_TABS[$tab]);
            if ($tab === 'ongoing') {
                $query->where('payment_status', '!=', 'abandoned');
            }
        }

        if ($request->filled('q')) {
            $q = '%'.str_replace(['%', '_'], ['\%', '\_'], $request->string('q')).'%';
            $query->where(fn ($b) => $b->where('order_number', 'like', $q)
                ->orWhereHas('subOrders.items', fn ($i) => $i->where('product_name', 'like', $q)));
        }

        $page = $query->paginate(min((int) $request->input('per_page', 10), 50));

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function order(Request $request, int $id)
    {
        $user = $request->user();
        $order = Order::with([
            'subOrders.store:id,name,slug,logo,location',
            'subOrders.items.product:id,slug,status',
            'subOrders.items.product.images',
            'subOrders.returns',
            'payment:id,order_id,reference,amount,currency,status,created_at',
        ])
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $reviewed = Review::where('user_id', $user->id)->pluck('product_id')->flip();

        foreach ($order->subOrders as $sub) {
            $canReturn = in_array($sub->status, OrderStatus::EARNED, true)
                && $sub->delivered_at
                && $sub->delivered_at->gte(now()->subDays(ReturnService::WINDOW_DAYS));
            $sub->setAttribute('can_cancel', $order->payment_status !== 'abandoned' && OrderStatus::customerCancellable($sub->status));
            $sub->setAttribute('return_deadline', $sub->delivered_at?->copy()->addDays(ReturnService::WINDOW_DAYS));

            foreach ($sub->items as $item) {
                $open = $sub->returns->where('order_item_id', $item->id)->whereNotIn('status', ['rejected', 'resolved'])->sum('quantity');
                $item->setAttribute('reviewed', $reviewed->has($item->product_id));
                $item->setAttribute('can_review', in_array($sub->status, OrderStatus::EARNED, true) && $order->payment_status === 'paid');
                $item->setAttribute('returnable_quantity', $canReturn ? max(0, $item->quantity - $open) : 0);
            }
        }

        return response()->json(['data' => $order]);
    }

    public function cancelSubOrder(Request $request, int $orderId, int $subOrderId)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $order = Order::where('user_id', $request->user()->id)->findOrFail($orderId);
        $sub = SubOrder::where('order_id', $order->id)->findOrFail($subOrderId);

        $sub = $this->orderService->transition($sub, OrderStatus::CANCELLED, 'customer', ['reason' => $data['reason']]);

        return response()->json([
            'message' => $sub->refund_status === 'pending'
                ? 'Cancelled. Your refund will reach your original payment method within 5 to 10 business days.'
                : 'Cancelled.',
            'data' => $sub->fresh(['items', 'store:id,name,slug']),
        ]);
    }

    public function returns(Request $request)
    {
        $rows = ReturnRequest::with(['item', 'store:id,name,slug', 'subOrder:id,order_id'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['data' => $rows, 'reasons' => ReturnRequest::REASONS]);
    }

    public function requestReturn(Request $request)
    {
        $data = $request->validate([
            'order_item_id' => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:1', 'max:50'],
            'reason' => ['required', 'in:'.implode(',', array_keys(ReturnRequest::REASONS))],
            'details' => ['nullable', 'string', 'max:2000'],
            'photos' => ['nullable', 'array', 'max:5'],
            'photos.*' => ['string', 'max:500', 'regex:#^(https?://|/)#i'],
        ]);

        $item = OrderItem::with('subOrder.order', 'subOrder.store')->findOrFail($data['order_item_id']);
        if ($item->subOrder?->order?->user_id !== $request->user()->id) {
            abort(404);
        }

        if (in_array($data['reason'], ['damaged', 'wrong_item', 'not_as_described'], true) && empty($data['photos'])) {
            return response()->json([
                'message' => 'Please add at least one photo showing the problem.',
                'errors' => ['photos' => ['Please add at least one photo showing the problem.']],
            ], 422);
        }

        $return = $this->returns->request(
            $request->user(),
            $item->subOrder,
            $item,
            (int) $data['quantity'],
            $data['reason'],
            $data['details'] ?? null,
            $data['photos'] ?? [],
        );

        return response()->json(['data' => $return->load('item')], 201);
    }

    public function escalateReturn(Request $request, int $id)
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:1000']]);
        $return = ReturnRequest::where('user_id', $request->user()->id)->findOrFail($id);

        return response()->json(['data' => $this->returns->escalate($return, $request->user(), $data['note'])]);
    }

    public function inbox(Request $request)
    {
        $page = InboxNotification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'unread' => InboxNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function markInboxRead(Request $request)
    {
        $data = $request->validate([
            'ids' => ['sometimes', 'array'],
            'ids.*' => ['integer'],
        ]);

        InboxNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->when(isset($data['ids']), fn ($q) => $q->whereIn('id', $data['ids']))
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Marked as read.']);
    }

    public function pendingReviews(Request $request)
    {
        $items = $this->pendingReviewsQuery($request->user()->id)
            ->with(['product:id,name,slug', 'product.images', 'subOrder:id,order_id,delivered_at'])
            ->latest('id')
            ->get()
            ->unique('product_id')
            ->values();

        return response()->json(['data' => $items]);
    }

    public function myReviews(Request $request)
    {
        return response()->json([
            'data' => Review::with(['product:id,name,slug', 'product.images'])
                ->where('user_id', $request->user()->id)
                ->latest()
                ->get(),
        ]);
    }

    public function vouchers(Request $request)
    {
        $user = $request->user();
        $used = CouponRedemption::where('user_id', $user->id)
            ->whereIn('status', ['reserved', 'redeemed'])
            ->selectRaw('coupon_id, count(*) as uses')
            ->groupBy('coupon_id')
            ->pluck('uses', 'coupon_id');
        $hasPaid = Order::where('user_id', $user->id)->where('payment_status', 'paid')->exists();

        $available = $this->availableVouchersQuery()
            ->with(['store:id,name,slug', 'category:id,name,slug'])
            ->orderBy('ends_at')
            ->get()
            ->filter(fn (Coupon $c) => ($used[$c->id] ?? 0) < max(1, $c->per_user_limit) && ! ($c->first_order_only && $hasPaid))
            ->values();

        $history = CouponRedemption::with(['coupon:id,code,description,type,value', 'order:id,order_number'])
            ->where('user_id', $user->id)
            ->where('status', 'redeemed')
            ->latest()
            ->get();

        return response()->json(['data' => ['available' => $available, 'used' => $history]]);
    }

    public function addresses(Request $request)
    {
        return response()->json([
            'data' => Address::where('user_id', $request->user()->id)->orderByDesc('is_default')->latest()->get(),
        ]);
    }

    public function storeAddress(Request $request)
    {
        $user = $request->user();
        $this->normalisePhone($request);
        $data = $request->validate($this->addressRules());

        if (Address::where('user_id', $user->id)->count() >= 20) {
            return response()->json(['message' => 'You can save up to 20 addresses. Delete one to add another.'], 422);
        }

        $address = DB::transaction(function () use ($user, $data) {
            $isFirst = ! Address::where('user_id', $user->id)->exists();
            $data['is_default'] = ! empty($data['is_default']) || $isFirst;
            if ($data['is_default']) {
                Address::where('user_id', $user->id)->update(['is_default' => false]);
            }

            return Address::create([...$data, 'user_id' => $user->id, 'country' => $data['country'] ?? 'Nigeria']);
        });

        return response()->json(['data' => $address], 201);
    }

    public function updateAddress(Request $request, int $id)
    {
        $user = $request->user();
        $address = Address::where('user_id', $user->id)->findOrFail($id);
        $this->normalisePhone($request);
        $data = $request->validate($this->addressRules(partial: true));

        DB::transaction(function () use ($user, $address, $data) {
            if (! empty($data['is_default'])) {
                Address::where('user_id', $user->id)->where('id', '!=', $address->id)->update(['is_default' => false]);
            } elseif (array_key_exists('is_default', $data) && $address->is_default) {
                unset($data['is_default']); // keep one default
            }
            $address->update($data);
        });

        return response()->json(['data' => $address->fresh()]);
    }

    public function deleteAddress(Request $request, int $id)
    {
        $user = $request->user();
        $address = Address::where('user_id', $user->id)->findOrFail($id);
        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            Address::where('user_id', $user->id)->latest()->first()?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Address deleted']);
    }

    public function wishlist(Request $request)
    {
        $items = Wishlist::with(['product' => fn ($q) => $q->withTrashed(), 'product.images', 'product.store:id,name,slug,status'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->each(function (Wishlist $row) {
                $p = $row->product;
                $row->setAttribute('available', $p && ! $p->trashed() && $p->status === 'published' && $p->store?->status === 'approved');
            });

        return response()->json(['data' => $items]);
    }

    public function toggleWishlist(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $existing = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $data['product_id'])
            ->first();

        if ($existing) {
            $existing->delete();

            return response()->json(['data' => ['wishlisted' => false]]);
        }

        Wishlist::create([
            'user_id' => $request->user()->id,
            'product_id' => $data['product_id'],
        ]);

        return response()->json(['data' => ['wishlisted' => true]]);
    }

    public function follows(Request $request)
    {
        $stores = $request->user()->followedStores()
            ->where('status', 'approved')
            ->withCount(['products' => fn ($q) => $q->where('status', 'published'), 'followers'])
            ->latest('store_follows.created_at')
            ->get();

        return response()->json(['data' => $stores]);
    }

    public function toggleFollow(Request $request)
    {
        $data = $request->validate(['store_id' => ['required', 'integer', 'exists:stores,id']]);
        $store = Store::where('status', 'approved')->findOrFail($data['store_id']);
        $user = $request->user();

        $following = $user->followedStores()->where('stores.id', $store->id)->exists();
        if ($following) {
            $user->followedStores()->detach($store->id);
        } else {
            $user->followedStores()->attach($store->id);
        }

        return response()->json([
            'data' => [
                'following' => ! $following,
                'followers_count' => $store->followers()->count(),
            ],
        ]);
    }

    public function review(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $delivered = OrderItem::query()
            ->where('product_id', $data['product_id'])
            ->whereHas('subOrder', function ($query) use ($request) {
                $query->whereIn('status', OrderStatus::EARNED)
                    ->whereHas('order', function ($order) use ($request) {
                        $order->where('user_id', $request->user()->id)
                            ->where('payment_status', 'paid');
                    });
            })
            ->exists();

        if (! $delivered) {
            return response()->json([
                'message' => 'You can review a product after it has been delivered to you.',
            ], 422);
        }

        $review = Review::updateOrCreate(
            ['user_id' => $request->user()->id, 'product_id' => $data['product_id']],
            ['rating' => $data['rating'], 'title' => $data['title'] ?? null, 'comment' => $data['comment'] ?? null]
        );

        self::refreshRatings($review->product);

        $product = $review->product;
        InboxNotification::notify($product->store?->user_id, 'review', "New {$data['rating']}★ review", "A customer reviewed {$product->name}.", '/vendor/reviews');

        return response()->json(['data' => $review->load('user:id,name')], 201);
    }

    /** Recalculate product and store ratings from visible reviews. */
    public static function refreshRatings(?Product $product): void
    {
        if (! $product) {
            return;
        }
        $visible = $product->reviews()->where('is_hidden', false);
        $product->rating = round((float) (clone $visible)->avg('rating'), 2);
        $product->reviews_count = (clone $visible)->count();
        $product->save();

        $store = $product->store;
        if ($store) {
            $average = Product::query()->where('store_id', $store->id)->where('reviews_count', '>', 0)->avg('rating');
            $store->rating = $average ? round((float) $average, 2) : 0;
            $store->save();
        }
    }

    public function profile(Request $request)
    {
        $user = $request->user();
        if ($request->isMethod('get')) {
            return response()->json(['data' => AuthController::transformUser($user->load('store'))]);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'avatar' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/)#i'],
            'newsletter_opt_in' => ['sometimes', 'boolean'],
        ]);

        $user->update($data);

        return response()->json(['data' => AuthController::transformUser($user->fresh('store'))]);
    }

    private function pendingReviewsQuery(int $userId): Builder
    {
        $reviewed = Review::where('user_id', $userId)->select('product_id');

        return OrderItem::query()
            ->whereNotIn('product_id', $reviewed)
            ->whereHas('product')
            ->whereHas('subOrder', fn ($q) => $q->whereIn('status', OrderStatus::EARNED)
                ->whereHas('order', fn ($o) => $o->where('user_id', $userId)->where('payment_status', 'paid')));
    }

    private function availableVouchersQuery(): Builder
    {
        return Coupon::query()
            ->where('is_active', true)
            ->where('is_public', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            ->where(fn ($q) => $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit'));
    }

    private function normalisePhone(Request $request): void
    {
        if ($request->filled('phone')) {
            $request->merge(['phone' => preg_replace('/[\s\-()]/', '', (string) $request->input('phone'))]);
        }
    }

    private function addressRules(bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'label' => ['nullable', 'string', 'max:40'],
            'full_name' => [$req, 'string', 'min:2', 'max:120'],
            'phone' => [$req, 'string', 'regex:/^(\+?234|0)[789][01]\d{8}$/'],
            'address_line' => [$req, 'string', 'min:5', 'max:255'],
            'city' => [$req, 'string', 'max:120'],
            'state' => [$req, 'string', 'max:60'],
            'country' => ['nullable', 'string', 'max:60'],
            'postal_code' => ['nullable', 'string', 'max:12'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
