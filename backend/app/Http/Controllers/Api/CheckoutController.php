<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderPaidMail;
use App\Models\InboxNotification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\SubOrder;
use App\Services\OrderService;
use App\Services\PaystackService;
use App\Services\VoucherService;
use App\Support\OrderStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CheckoutController extends Controller
{
    public const MAX_QTY_PER_LINE = 20;

    public function __construct(
        private PaystackService $paystack,
        private OrderService $orders,
        private VoucherService $vouchers,
    ) {}

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:'.self::MAX_QTY_PER_LINE],
            'address_id' => ['nullable', 'integer'],
            'shipping_address' => ['required_without:address_id', 'array'],
            'shipping_address.full_name' => ['required_without:address_id', 'string', 'max:120'],
            'shipping_address.phone' => ['required_without:address_id', 'string', 'max:30'],
            'shipping_address.address_line' => ['required_without:address_id', 'string', 'max:255'],
            'shipping_address.city' => ['required_without:address_id', 'string', 'max:120'],
            'shipping_address.state' => ['required_without:address_id', 'string', 'max:120'],
            'shipping_address.country' => ['nullable', 'string', 'max:120'],
            'callback_url' => ['nullable', 'url', 'max:500'],
            'coupon_code' => ['nullable', 'string', 'max:60'],
        ]);

        $user = $request->user();
        $commissionRate = (float) Setting::getValue('commission_rate', 10);
        $callbackUrl = $this->safeCallbackUrl($data['callback_url'] ?? null);

        $address = null;
        if (! empty($data['address_id'])) {
            $address = $user->addresses()->findOrFail($data['address_id']);
        }
        $shipping = $address
            ? $address->only(['full_name', 'phone', 'address_line', 'city', 'state', 'country', 'postal_code'])
            : $data['shipping_address'];
        $shipping['country'] ??= 'Nigeria';

        // Merge duplicate lines so stock is checked against the combined quantity.
        $lines = [];
        foreach ($data['items'] as $item) {
            $key = $item['product_id'].':'.($item['variant_id'] ?? '0');
            $lines[$key] = [
                'product_id' => (int) $item['product_id'],
                'variant_id' => isset($item['variant_id']) ? (int) $item['variant_id'] : null,
                'quantity' => ($lines[$key]['quantity'] ?? 0) + (int) $item['quantity'],
            ];
            if ($lines[$key]['quantity'] > self::MAX_QTY_PER_LINE) {
                throw ValidationException::withMessages([
                    'items' => ['You can order at most '.self::MAX_QTY_PER_LINE.' of one item.'],
                ]);
            }
        }

        $couponCode = $data['coupon_code'] ?? null;

        $order = DB::transaction(function () use ($lines, $user, $commissionRate, $shipping, $address, $couponCode) {
            $grouped = [];
            $subtotal = 0;

            foreach ($lines as $line) {
                $product = Product::with(['store', 'images'])->lockForUpdate()->findOrFail($line['product_id']);

                if ($product->status !== 'published' || $product->store?->status !== 'approved') {
                    abort(422, "{$product->name} is no longer available.");
                }

                $quantity = $line['quantity'];
                $unitPrice = (float) $product->price;
                $variant = null;

                if ($product->variants()->exists() && ! $line['variant_id']) {
                    abort(422, "Please choose an option for {$product->name}.");
                }

                if ($line['variant_id']) {
                    $variant = ProductVariant::where('product_id', $product->id)->lockForUpdate()->find($line['variant_id']);
                    if (! $variant) {
                        abort(422, "The selected option for {$product->name} is unavailable.");
                    }
                    if ($variant->stock < $quantity) {
                        abort(422, "Only {$variant->stock} left of {$product->name} ({$variant->name}).");
                    }
                    if ($variant->price !== null && (float) $variant->price > 0) {
                        $unitPrice = (float) $variant->price;
                    }
                }

                if ($product->stock < $quantity) {
                    abort(422, "Only {$product->stock} left of {$product->name}.");
                }

                // Reserve stock now; it is released if payment fails or expires.
                if ($variant) {
                    $variant->decrement('stock', $quantity);
                }
                $product->decrement('stock', $quantity);

                $lineTotal = round($unitPrice * $quantity, 2);
                $subtotal += $lineTotal;
                $storeId = $product->store_id;

                $grouped[$storeId] ??= ['store' => $product->store, 'items' => [], 'subtotal' => 0];
                $grouped[$storeId]['items'][] = [
                    'product' => $product,
                    'variant' => $variant,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total' => $lineTotal,
                ];
                $grouped[$storeId]['subtotal'] += $lineTotal;
            }

            $shippingTotal = 0;
            $shippingByStore = [];
            foreach ($grouped as $storeId => $group) {
                $shippingByStore[$storeId] = (float) ($group['store']->shipping_fee ?? 0);
                $shippingTotal += $shippingByStore[$storeId];
            }

            $voucher = null;
            if ($couponCode) {
                $voucher = $this->vouchers->evaluate($couponCode, $user, collect($grouped)->flatMap(fn ($g, $storeId) => collect($g['items'])->map(fn ($l) => [
                    'store_id' => $storeId,
                    'category_id' => $l['product']->category_id,
                    'total' => $l['total'],
                ]))->values()->all(), $shippingByStore);
            }
            $discount = (float) ($voucher['discount'] ?? 0);

            $order = Order::create([
                'order_number' => 'ATL-'.strtoupper(Str::random(8)),
                'user_id' => $user->id,
                'address_id' => $address?->id,
                'status' => OrderStatus::PENDING,
                'payment_status' => 'pending',
                'subtotal' => $subtotal,
                'shipping_total' => $shippingTotal,
                'discount_total' => $discount,
                'coupon_code' => $voucher['coupon']->code ?? null,
                'total' => max(0, $subtotal + $shippingTotal - $discount),
                'shipping_snapshot' => $shipping,
            ]);

            if ($voucher) {
                $this->vouchers->reserve($voucher['coupon'], $user, $order, $discount);
            }

            foreach ($grouped as $group) {
                $store = $group['store'];
                $ship = (float) ($store->shipping_fee ?? 0);
                $storeSubtotal = $group['subtotal'];
                $commission = round($storeSubtotal * ($commissionRate / 100), 2);

                $subOrder = SubOrder::create([
                    'order_id' => $order->id,
                    'store_id' => $store->id,
                    'status' => OrderStatus::PENDING,
                    'subtotal' => $storeSubtotal,
                    'shipping_fee' => $ship,
                    // Platform-funded: the seller's earning is unaffected by vouchers.
                    'discount' => (float) ($voucher['per_store'][$store->id] ?? 0),
                    'total' => $storeSubtotal + $ship,
                    'commission' => $commission,
                    'vendor_earning' => $storeSubtotal + $ship - $commission,
                ]);

                foreach ($group['items'] as $line) {
                    OrderItem::create([
                        'sub_order_id' => $subOrder->id,
                        'product_id' => $line['product']->id,
                        'product_variant_id' => $line['variant']?->id,
                        'product_name' => $line['product']->name,
                        'variant_name' => $line['variant']?->name,
                        'image' => $line['product']->images->first()?->url,
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unit_price'],
                        'total' => $line['total'],
                    ]);
                }
            }

            $reference = 'atk_'.Str::lower(Str::random(20));
            Payment::create([
                'order_id' => $order->id,
                'provider' => 'paystack',
                'reference' => $reference,
                'amount' => $order->total,
                'currency' => 'NGN',
                'status' => 'pending',
            ]);
            $order->paystack_reference = $reference;
            $order->save();

            return $order->load('subOrders.items', 'payment');
        });

        $split = $this->buildSplit($order);

        try {
            $init = $this->paystack->initializeTransaction([
                'email' => $user->email,
                'amount' => $this->toKobo($order->total),
                'currency' => 'NGN',
                'reference' => $order->paystack_reference,
                'callback_url' => $callbackUrl,
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ],
                'subaccount' => $split['subaccount'] ?? null,
                'transaction_charge' => $split['transaction_charge'] ?? null,
                'bearer' => isset($split['subaccount']) ? 'account' : null,
            ]);
        } catch (RuntimeException $e) {
            $this->orders->expireOrder($order, 'failed', 'initialization_failed');

            return response()->json(['message' => $e->getMessage()], 503);
        }

        if (isset($split['subaccount']) && ! ($init['demo'] ?? false)) {
            SubOrder::where('order_id', $order->id)->update(['settled_via_split' => true]);
        }

        return response()->json([
            'data' => [
                'order' => $order,
                'payment' => $order->payment,
                'authorization_url' => $init['data']['authorization_url'] ?? null,
                'access_code' => $init['data']['access_code'] ?? null,
                'reference' => $order->paystack_reference,
                'demo' => $init['demo'] ?? false,
            ],
        ]);
    }

    public function webhook(Request $request)
    {
        if (! $this->paystack->verifyWebhookSignature($request)) {
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $payload = $request->all();
        $event = $payload['event'] ?? null;
        $data = $payload['data'] ?? [];

        if ($event === 'charge.success') {
            $this->markPaid((string) ($data['reference'] ?? ''), $payload, $data);
        }

        return response()->json(['message' => 'ok']);
    }

    public function verify(Request $request, string $reference)
    {
        $order = Order::where('paystack_reference', $reference)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($order->payment_status === 'pending') {
            try {
                $result = $this->paystack->verifyTransaction($reference);
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 503);
            }

            $data = $result['data'] ?? [];
            $status = $data['status'] ?? null;

            if ($status === 'success') {
                $this->markPaid($reference, $result, $data, (bool) ($result['demo'] ?? false));
            } elseif (in_array($status, ['failed', 'abandoned', 'reversed'], true)) {
                $this->orders->expireOrder($order, 'failed', $status);
            }
        }

        $order = Order::with('subOrders.items.product.images', 'subOrders.store', 'payment')->findOrFail($order->id);

        return response()->json(['data' => $order]);
    }

    /**
     * Confirm a payment. Idempotent; refuses amounts or currencies that don't match the order.
     */
    private function markPaid(string $reference, array $payload, array $data, bool $demo = false): void
    {
        if (! $reference) {
            return;
        }

        $demo = $demo || $this->paystack->isDemo();
        $paidOrder = null;

        DB::transaction(function () use ($reference, $payload, $data, $demo, &$paidOrder) {
            $payment = Payment::where('reference', $reference)->lockForUpdate()->first();
            if (! $payment || $payment->status === 'success') {
                return;
            }

            $order = $payment->order()->with('subOrders.items', 'user')->first();
            if (! $order) {
                return;
            }

            if (! $demo) {
                $amount = (int) ($data['amount'] ?? -1);
                $currency = strtoupper((string) ($data['currency'] ?? ''));
                if ($amount !== $this->toKobo($order->total) || $currency !== strtoupper((string) $payment->currency)) {
                    Log::warning('Paystack amount mismatch', ['reference' => $reference, 'amount' => $amount, 'currency' => $currency]);
                    $payment->status = 'failed';
                    $payment->failure_reason = 'amount_mismatch';
                    $payment->payload = $payload;
                    $payment->save();

                    return;
                }
            }

            // A late payment for an order whose reservation already expired: re-reserve if possible.
            if ($order->payment_status !== 'pending') {
                if (! $this->rereserve($order)) {
                    $payment->status = 'success';
                    $payment->failure_reason = 'paid_after_expiry_refund_due';
                    $payment->payload = $payload;
                    $payment->save();
                    $order->payment_status = 'refund_due';
                    $order->save();

                    return;
                }
            }

            $payment->status = 'success';
            $payment->payload = $payload;
            $payment->save();

            $order->payment_status = 'paid';
            $order->save();
            $this->vouchers->redeem($order);

            foreach ($order->subOrders as $subOrder) {
                if (in_array($subOrder->status, [OrderStatus::PENDING, OrderStatus::EXPIRED], true)) {
                    $subOrder->status = OrderStatus::PAID;
                    $subOrder->save();
                }
            }

            $order->syncStatus();
            $paidOrder = $order;

            InboxNotification::notify($order->user_id, 'order', 'Order confirmed', "We received your payment for order {$order->order_number}. Sellers are preparing your items.", '/account/orders/'.$order->id);
            foreach ($order->subOrders()->with('store')->get() as $sub) {
                InboxNotification::notify($sub->store?->user_id, 'order', 'New paid order', "Order {$order->order_number}: please process and ship within 2 business days.", '/vendor/orders/'.$sub->id);
            }
        });

        if ($paidOrder && $paidOrder->user?->email) {
            try {
                Mail::to($paidOrder->user->email)->send(new OrderPaidMail($paidOrder));
            } catch (\Throwable $e) {
                Log::warning('Order mail failed', ['order' => $paidOrder->id, 'error' => $e->getMessage()]);
            }
        }
    }

    /** Re-reserve stock for an expired order that was paid late. */
    private function rereserve(Order $order): bool
    {
        foreach ($order->subOrders as $subOrder) {
            foreach ($subOrder->items as $item) {
                $product = Product::lockForUpdate()->find($item->product_id);
                if (! $product || $product->stock < $item->quantity) {
                    return false;
                }
                if ($item->product_variant_id) {
                    $variant = ProductVariant::lockForUpdate()->find($item->product_variant_id);
                    if (! $variant || $variant->stock < $item->quantity) {
                        return false;
                    }
                }
            }
        }

        foreach ($order->subOrders as $subOrder) {
            foreach ($subOrder->items as $item) {
                Product::where('id', $item->product_id)->decrement('stock', $item->quantity);
                if ($item->product_variant_id) {
                    ProductVariant::where('id', $item->product_variant_id)->decrement('stock', $item->quantity);
                }
            }
        }

        return true;
    }

    private function buildSplit(Order $order): array
    {
        // Discounted orders are paid out through statements so the platform can absorb the voucher.
        if ((float) $order->discount_total > 0) {
            return [];
        }

        $subOrders = $order->subOrders()->with('store')->get();
        if ($subOrders->count() === 1) {
            $store = $subOrders->first()->store;
            if ($store?->paystack_subaccount_code) {
                return [
                    'subaccount' => $store->paystack_subaccount_code,
                    'transaction_charge' => $this->toKobo($subOrders->first()->commission),
                ];
            }
        }

        return [];
    }

    /** Only redirect back to our own storefront after payment. */
    private function safeCallbackUrl(?string $url): string
    {
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $default = $frontend.'/checkout/success';

        if (! $url) {
            return $default;
        }

        $host = parse_url($url, PHP_URL_HOST);
        $allowed = array_filter([parse_url($frontend, PHP_URL_HOST)]);
        if (! app()->environment('production')) {
            array_push($allowed, 'localhost', '127.0.0.1');
        }

        return in_array($host, $allowed, true) ? $url : $default;
    }

    private function toKobo(mixed $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}
