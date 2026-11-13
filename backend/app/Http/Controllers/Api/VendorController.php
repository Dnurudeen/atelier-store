<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payout;
use App\Models\Product;
use App\Models\Sponsorship;
use App\Models\Statement;
use App\Models\Store;
use App\Models\SubOrder;
use App\Services\OrderService;
use App\Services\PaystackService;
use App\Support\OrderStatus;
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
        private OrderService $orderService,
    ) {}

    public function overview(Request $request)
    {
        $store = $this->storeOrFail($request);
        $this->sponsorships->accrueStore($store);
        $store->setAttribute('seller_score', $this->scores->forStore($store));

        $paid = fn () => SubOrder::where('store_id', $store->id)
            ->whereHas('order', fn ($q) => $q->where('payment_status', 'paid'));

        $sales = (float) $paid()->whereNotIn('status', ['cancelled', 'returned'])->sum('subtotal');
        $orders = $paid()->count();
        $products = Product::where('store_id', $store->id)->count();
        $earnings = $this->statements->pending($store);

        // Daily revenue for the last 30 days (paid, not cancelled/returned).
        $since = now()->subDays(29)->startOfDay();
        $daily = $paid()
            ->whereNotIn('status', ['cancelled', 'returned'])
            ->where('created_at', '>=', $since)
            ->get(['subtotal', 'created_at'])
            ->groupBy(fn ($row) => $row->created_at->toDateString())
            ->map(fn ($rows) => ['sales' => round((float) $rows->sum('subtotal'), 2), 'orders' => $rows->count()]);
        $series = collect(range(0, 29))->map(function ($i) use ($since, $daily) {
            $day = $since->copy()->addDays($i)->toDateString();

            return ['date' => $day, 'sales' => $daily[$day]['sales'] ?? 0, 'orders' => $daily[$day]['orders'] ?? 0];
        });

        $topProducts = \App\Models\OrderItem::query()
            ->whereHas('subOrder', fn ($q) => $q->where('store_id', $store->id)
                ->whereNotIn('status', ['cancelled', 'returned', 'pending', 'expired']))
            ->selectRaw('product_id, product_name, sum(quantity) as units, sum(total) as revenue')
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('units')
            ->limit(5)
            ->get();

        $lowStock = Product::with('images')
            ->where('store_id', $store->id)
            ->whereIn('status', ['published', 'pending'])
            ->whereColumn('stock', '<=', 'low_stock_threshold')
            ->orderBy('stock')
            ->limit(6)
            ->get(['id', 'name', 'slug', 'stock', 'low_stock_threshold', 'status']);

        $todo = [
            'to_process' => $paid()->whereIn('status', ['paid', 'processing'])->count(),
            'late' => $paid()->whereIn('status', ['paid', 'processing'])->where('created_at', '<', now()->subDays(2))->count(),
            'returns' => \App\Models\ReturnRequest::where('store_id', $store->id)->whereIn('status', ['requested', 'approved'])->count(),
            'unanswered_reviews' => \App\Models\Review::whereHas('product', fn ($q) => $q->where('store_id', $store->id))->whereNull('vendor_reply')->where('is_hidden', false)->count(),
            'rejected_products' => Product::where('store_id', $store->id)->where('status', 'rejected')->count(),
            'pending_products' => Product::where('store_id', $store->id)->where('status', 'pending')->count(),
        ];

        return response()->json([
            'data' => [
                'store' => $store->withPrivateDetails(),
                'stats' => compact('orders', 'sales', 'products', 'earnings'),
                'series' => $series,
                'top_products' => $topProducts,
                'low_stock' => $lowStock,
                'todo' => $todo,
                'followers' => $store->followers()->count(),
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

        return response()->json(['data' => $store->fresh()->withPrivateDetails()]);
    }

    public function orders(Request $request)
    {
        $store = $this->storeOrFail($request);
        $query = SubOrder::with(['items.product:id,slug', 'items.product.images', 'order:id,order_number,user_id,payment_status,created_at,shipping_snapshot', 'order.user:id,name'])
            ->where('store_id', $store->id)
            // Sellers only see orders the customer has paid for (or paid ones later cancelled/returned).
            ->whereHas('order', fn ($q) => $q->whereIn('payment_status', ['paid', 'refund_due']))
            ->latest();

        $tabs = [
            'new' => ['paid'],
            'processing' => ['processing'],
            'shipped' => ['shipped'],
            'delivered' => ['delivered', 'completed'],
            'closed' => ['cancelled', 'returned'],
        ];
        $status = $request->string('status')->toString();
        if (isset($tabs[$status])) {
            $query->whereIn('status', $tabs[$status]);
        }
        if ($request->filled('q')) {
            $q = '%'.str_replace(['%', '_'], ['\%', '\_'], $request->string('q')).'%';
            $query->where(fn ($b) => $b->whereHas('order', fn ($o) => $o->where('order_number', 'like', $q))
                ->orWhereHas('items', fn ($i) => $i->where('product_name', 'like', $q)));
        }

        $counts = SubOrder::where('store_id', $store->id)
            ->whereHas('order', fn ($q) => $q->whereIn('payment_status', ['paid', 'refund_due']))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $page = $query->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'counts' => collect($tabs)->map(fn ($statuses) => (int) collect($statuses)->sum(fn ($s) => $counts[$s] ?? 0)),
            ],
        ]);
    }

    public function order(Request $request, int $id)
    {
        $store = $this->storeOrFail($request);
        $sub = SubOrder::with([
            'items.product:id,slug,sku',
            'items.product.images',
            'items.variant:id,sku,name',
            'order:id,order_number,user_id,payment_status,created_at,shipping_snapshot',
            'order.user:id,name,email',
            'returns',
        ])
            ->where('store_id', $store->id)
            ->whereHas('order', fn ($q) => $q->whereIn('payment_status', ['paid', 'refund_due']))
            ->findOrFail($id);

        return response()->json(['data' => $sub, 'store' => $store->only(['id', 'name', 'location', 'logo'])]);
    }

    public function reviews(Request $request)
    {
        $store = $this->storeOrFail($request);
        $query = \App\Models\Review::with(['product:id,name,slug', 'product.images', 'user:id,name'])
            ->whereHas('product', fn ($q) => $q->where('store_id', $store->id))
            ->where('is_hidden', false)
            ->latest();
        if ($request->string('filter')->toString() === 'unanswered') {
            $query->whereNull('vendor_reply');
        }

        return response()->json(['data' => $query->limit(200)->get()]);
    }

    public function replyReview(Request $request, int $id)
    {
        $store = $this->storeOrFail($request);
        $data = $request->validate(['reply' => ['required', 'string', 'min:2', 'max:1000']]);
        $review = \App\Models\Review::whereHas('product', fn ($q) => $q->where('store_id', $store->id))->findOrFail($id);
        $review->update(['vendor_reply' => $data['reply'], 'vendor_replied_at' => now()]);

        \App\Models\InboxNotification::notify($review->user_id, 'review', "{$store->name} replied to your review", $data['reply'], '/product/'.$review->product?->slug.'#reviews');

        return response()->json(['data' => $review->fresh(['product:id,name,slug', 'user:id,name'])]);
    }

    public function exportProducts(Request $request)
    {
        $store = $this->storeOrFail($request);
        $rows = Product::with(['category:id,name', 'brand:id,name'])->where('store_id', $store->id)->orderBy('id')->get();

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['id', 'sku', 'name', 'brand', 'category', 'status', 'price', 'compare_at_price', 'stock', 'sold', 'rating', 'reviews', 'url']);
        foreach ($rows as $p) {
            fputcsv($csv, [
                $p->id, $p->sku, $p->name, $p->brand?->name, $p->category?->name, $p->status, $p->price,
                $p->getRawOriginal('compare_at_price'), $p->stock, $p->sold_count, $p->rating, $p->reviews_count,
                rtrim((string) config('app.frontend_url'), '/').'/product/'.$p->slug,
            ]);
        }
        rewind($csv);
        $body = stream_get_contents($csv);
        fclose($csv);

        return response($body, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="products-'.now()->format('Y-m-d').'.csv"',
        ]);
    }

    public function updateOrder(Request $request, int $id)
    {
        $store = $this->storeOrFail($request);
        $subOrder = SubOrder::where('store_id', $store->id)->findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', [...OrderStatus::VENDOR_SETTABLE, 'completed'])],
            'tracking_number' => ['nullable', 'string', 'max:120'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $subOrder = $this->orderService->transition($subOrder, $data['status'], 'vendor', [
            'tracking_number' => $data['tracking_number'] ?? null,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['data' => $subOrder->fresh(['items', 'order'])]);
    }

    public function returns(Request $request)
    {
        $store = $this->storeOrFail($request);
        $query = \App\Models\ReturnRequest::with(['item', 'user:id,name', 'subOrder:id,order_id,tracking_number', 'subOrder.order:id,order_number'])
            ->where('store_id', $store->id)
            ->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function updateReturn(Request $request, int $id, \App\Services\ReturnService $returns)
    {
        $store = $this->storeOrFail($request);
        $data = $request->validate([
            'action' => ['required', 'in:approve,reject,receive'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $return = \App\Models\ReturnRequest::where('store_id', $store->id)->findOrFail($id);

        return response()->json(['data' => $returns->sellerAction($return, $data['action'], $data['note'] ?? null)->load('item')]);
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
            'logo' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/)#i'],
            'banner' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/)#i'],
            'bank_name' => ['nullable', 'string'],
            'account_number' => ['nullable', 'string'],
            'account_name' => ['nullable', 'string'],
        ]);

        $bankChanged = collect(['bank_name', 'account_number', 'account_name'])
            ->contains(fn ($key) => array_key_exists($key, $data) && $data[$key] !== $store->{$key});
        $store->fill($data);
        if ($bankChanged) {
            // New payout account: the old Paystack split account must not receive funds.
            $store->paystack_subaccount_code = null;
        }
        $store->save();

        return response()->json(['data' => $store->fresh()->withPrivateDetails()]);
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

    private function storeOrFail(Request $request): Store
    {
        $store = $request->user()->store;
        abort_unless($store, 404, 'Vendor store not found');

        return $store;
    }
}
