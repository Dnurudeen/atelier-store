<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PersonalAccessToken;
use App\Models\Product;
use App\Services\VoucherService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Re-price a browser cart against live data: current prices, stock, availability,
 * per-seller shipping and an optional voucher. Nothing is reserved here.
 */
class CartController extends Controller
{
    public function __construct(private VoucherService $vouchers) {}

    public function quote(Request $request)
    {
        $data = $request->validate([
            'items' => ['present', 'array', 'max:50'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.variant_id' => ['nullable', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:'.CheckoutController::MAX_QTY_PER_LINE],
            'coupon_code' => ['nullable', 'string', 'max:60'],
        ]);

        $ids = collect($data['items'])->pluck('product_id')->unique();
        $products = Product::with(['images', 'variants', 'store', 'category:id,parent_id,name,slug'])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $lines = [];
        $stores = [];
        $subtotal = 0.0;

        foreach ($data['items'] as $item) {
            $product = $products->get($item['product_id']);
            $variant = $product && ! empty($item['variant_id']) ? $product->variants->firstWhere('id', (int) $item['variant_id']) : null;
            $key = $item['product_id'].':'.($item['variant_id'] ?? null ?: 'base');

            $issue = null;
            $available = 0;
            if (! $product || $product->status !== 'published' || $product->store?->status !== 'approved') {
                $issue = 'unavailable';
            } elseif ($product->variants->isNotEmpty() && ! $variant) {
                $issue = 'choose_option';
            } else {
                $available = (int) min($variant ? $variant->stock : $product->stock, $product->stock);
                if ($available <= 0) {
                    $issue = 'out_of_stock';
                } elseif ($available < $item['quantity']) {
                    $issue = 'limited_stock';
                }
            }

            $unit = $product ? (float) ($variant && $variant->price && (float) $variant->price > 0 ? $variant->price : $product->price) : 0.0;
            $quantity = $issue === 'limited_stock' ? $available : (int) $item['quantity'];
            $purchasable = in_array($issue, [null, 'limited_stock'], true);
            $total = $purchasable ? round($unit * $quantity, 2) : 0.0;

            if ($purchasable) {
                $subtotal += $total;
                $storeId = $product->store_id;
                $stores[$storeId] ??= [
                    'store' => $product->store->only(['id', 'name', 'slug', 'location', 'logo']),
                    'shipping_fee' => (float) ($product->store->shipping_fee ?? 0),
                    'subtotal' => 0.0,
                ];
                $stores[$storeId]['subtotal'] += $total;
            }

            $lines[] = [
                'key' => $key,
                'product_id' => (int) $item['product_id'],
                'variant_id' => $variant?->id,
                'quantity' => $quantity,
                'requested_quantity' => (int) $item['quantity'],
                'available' => $available,
                'unit_price' => $unit,
                'total' => $total,
                'issue' => $issue,
                'store_id' => $product?->store_id,
                'category_id' => $product?->category_id,
                'product' => $product ? $product->only(['id', 'name', 'slug', 'price', 'compare_at_price', 'stock', 'status']) + [
                    'images' => $product->images->take(1)->values(),
                    'store' => $product->store?->only(['id', 'name', 'slug']),
                ] : null,
                'variant' => $variant?->only(['id', 'name', 'price', 'stock', 'attributes']),
            ];
        }

        $shipping = collect($stores)->mapWithKeys(fn ($s, $id) => [$id => $s['shipping_fee']])->all();
        $shippingTotal = array_sum($shipping);

        $voucher = null;
        $voucherError = null;
        if (! empty($data['coupon_code']) && $subtotal > 0) {
            try {
                $eval = $this->vouchers->evaluate(
                    $data['coupon_code'],
                    $this->optionalUser($request),
                    collect($lines)->filter(fn ($l) => $l['total'] > 0)->map(fn ($l) => [
                        'store_id' => $l['store_id'], 'category_id' => $l['category_id'], 'total' => $l['total'],
                    ])->values()->all(),
                    $shipping,
                );
                $voucher = [
                    'code' => $eval['coupon']->code,
                    'description' => $eval['coupon']->description,
                    'discount' => $eval['discount'],
                    'free_shipping' => $eval['free_shipping'],
                ];
            } catch (ValidationException $e) {
                $voucherError = $e->errors()['coupon_code'][0] ?? 'This voucher cannot be used.';
            }
        }

        $discount = (float) ($voucher['discount'] ?? 0);

        return response()->json([
            'data' => [
                'lines' => $lines,
                'stores' => array_values($stores),
                'subtotal' => round($subtotal, 2),
                'shipping_total' => round($shippingTotal, 2),
                'discount_total' => round($discount, 2),
                'total' => round(max(0, $subtotal + $shippingTotal - $discount), 2),
                'voucher' => $voucher,
                'voucher_error' => $voucherError,
                'has_issues' => collect($lines)->contains(fn ($l) => $l['issue'] !== null),
            ],
        ]);
    }

    private function optionalUser(Request $request)
    {
        $plain = $request->bearerToken();

        return $plain ? PersonalAccessToken::findToken($plain)?->user : null;
    }
}
