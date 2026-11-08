<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\Product;
use App\Models\Setting;
use App\Models\SubOrder;
use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    public function __construct(private PaystackService $paystack) {}

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'shipping_address' => ['required', 'array'],
            'shipping_address.full_name' => ['required', 'string'],
            'shipping_address.phone' => ['required', 'string'],
            'shipping_address.address_line' => ['required', 'string'],
            'shipping_address.city' => ['required', 'string'],
            'shipping_address.state' => ['required', 'string'],
            'shipping_address.country' => ['nullable', 'string'],
            'callback_url' => ['nullable', 'url'],
        ]);

        $user = $request->user();
        $commissionRate = (float) Setting::getValue('commission_rate', 10);

        $order = DB::transaction(function () use ($data, $user, $commissionRate) {
            $grouped = [];
            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $product = Product::with('store')->findOrFail($item['product_id']);
                if ($product->status !== 'published') {
                    abort(422, "Product {$product->name} is unavailable.");
                }

                $lineTotal = (float) $product->price * (int) $item['quantity'];
                $subtotal += $lineTotal;
                $storeId = $product->store_id;

                if (! isset($grouped[$storeId])) {
                    $grouped[$storeId] = [
                        'store' => $product->store,
                        'items' => [],
                        'subtotal' => 0,
                    ];
                }

                $grouped[$storeId]['items'][] = [
                    'product' => $product,
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => (float) $product->price,
                    'total' => $lineTotal,
                    'variant_id' => $item['variant_id'] ?? null,
                ];
                $grouped[$storeId]['subtotal'] += $lineTotal;
            }

            $shippingTotal = 0;
            foreach ($grouped as $group) {
                $shippingTotal += (float) ($group['store']->shipping_fee ?? 0);
            }

            $order = Order::create([
                'order_number' => 'ATL-' . strtoupper(Str::random(8)),
                'user_id' => $user->id,
                'status' => 'pending',
                'payment_status' => 'pending',
                'subtotal' => $subtotal,
                'shipping_total' => $shippingTotal,
                'total' => $subtotal + $shippingTotal,
                'shipping_snapshot' => $data['shipping_address'],
            ]);

            foreach ($grouped as $group) {
                $store = $group['store'];
                $ship = (float) ($store->shipping_fee ?? 0);
                $storeSubtotal = $group['subtotal'];
                $storeTotal = $storeSubtotal + $ship;
                $commission = round($storeSubtotal * ($commissionRate / 100), 2);
                $vendorEarning = $storeTotal - $commission;

                $subOrder = SubOrder::create([
                    'order_id' => $order->id,
                    'store_id' => $store->id,
                    'status' => 'pending',
                    'subtotal' => $storeSubtotal,
                    'shipping_fee' => $ship,
                    'total' => $storeTotal,
                    'commission' => $commission,
                    'vendor_earning' => $vendorEarning,
                ]);

                foreach ($group['items'] as $line) {
                    OrderItem::create([
                        'sub_order_id' => $subOrder->id,
                        'product_id' => $line['product']->id,
                        'product_variant_id' => $line['variant_id'],
                        'product_name' => $line['product']->name,
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unit_price'],
                        'total' => $line['total'],
                    ]);
                }

                Payout::create([
                    'store_id' => $store->id,
                    'sub_order_id' => $subOrder->id,
                    'amount' => $vendorEarning,
                    'commission' => $commission,
                    'status' => 'pending',
                ]);
            }

            return $order->load('subOrders.items');
        });

        $reference = 'atk_' . Str::lower(Str::random(16));
        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'paystack',
            'reference' => $reference,
            'amount' => $order->total,
            'currency' => 'NGN',
            'status' => 'pending',
        ]);

        $order->paystack_reference = $reference;
        $order->save();

        $split = $this->buildSplit($order);
        $init = $this->paystack->initializeTransaction([
            'email' => $user->email,
            'amount' => (int) round(((float) $order->total) * 100),
            'reference' => $reference,
            'callback_url' => $data['callback_url'] ?? config('app.frontend_url') . '/checkout/success',
            'metadata' => [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ],
            'subaccount' => $split['subaccount'] ?? null,
            'transaction_charge' => $split['transaction_charge'] ?? null,
            'bearer' => 'account',
        ]);

        return response()->json([
            'data' => [
                'order' => $order,
                'payment' => $payment,
                'authorization_url' => $init['data']['authorization_url'] ?? null,
                'access_code' => $init['data']['access_code'] ?? null,
                'reference' => $reference,
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
            $this->markPaid($data['reference'] ?? '', $payload);
        }

        return response()->json(['message' => 'ok']);
    }

    public function verify(Request $request, string $reference)
    {
        $result = $this->paystack->verifyTransaction($reference);
        $status = $result['data']['status'] ?? null;

        if ($status === 'success' || ($result['demo'] ?? false)) {
            $this->markPaid($reference, $result);
        }

        $order = Order::with('subOrders.items.product.images', 'subOrders.store')
            ->where('paystack_reference', $reference)
            ->firstOrFail();

        return response()->json(['data' => $order]);
    }

    private function markPaid(string $reference, array $payload): void
    {
        if (! $reference) {
            return;
        }

        $payment = Payment::where('reference', $reference)->first();
        if (! $payment || $payment->status === 'success') {
            return;
        }

        $payment->status = 'success';
        $payment->payload = $payload;
        $payment->save();

        $order = $payment->order;
        $order->payment_status = 'paid';
        $order->status = 'processing';
        $order->save();

        foreach ($order->subOrders as $subOrder) {
            $subOrder->status = 'paid';
            $subOrder->save();
        }

        Payout::whereIn('sub_order_id', $order->subOrders->pluck('id'))
            ->update(['status' => 'available']);
    }

    private function buildSplit(Order $order): array
    {
        // Prefer single-vendor subaccount when cart is from one store with Paystack subaccount.
        $subOrders = $order->subOrders()->with('store')->get();
        if ($subOrders->count() === 1) {
            $store = $subOrders->first()->store;
            if ($store?->paystack_subaccount_code) {
                $commission = (int) round(((float) $subOrders->first()->commission) * 100);

                return [
                    'subaccount' => $store->paystack_subaccount_code,
                    'transaction_charge' => $commission,
                ];
            }
        }

        return [];
    }
}
