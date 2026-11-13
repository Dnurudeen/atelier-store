<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Order;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Platform-funded vouchers.
 *
 * The discount reduces what the customer pays; seller earnings are unchanged
 * (the platform absorbs it from commission), so vouchers never cut a seller's payout.
 *
 * $lines: [['store_id' => int, 'category_id' => ?int, 'total' => float], ...]
 * $shipping: [store_id => fee]
 */
class VoucherService
{
    /** @return array{coupon: Coupon, discount: float, per_store: array<int, float>, free_shipping: bool} */
    public function evaluate(string $code, ?User $user, array $lines, array $shipping): array
    {
        $coupon = Coupon::where('code', strtoupper(trim($code)))->first();
        $fail = fn (string $msg) => throw ValidationException::withMessages(['coupon_code' => [$msg]]);

        if (! $coupon || ! $coupon->is_active) {
            $fail('This voucher code is not valid.');
        }
        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            $fail('This voucher is not active yet.');
        }
        if ($coupon->ends_at && $coupon->ends_at->isPast()) {
            $fail('This voucher has expired.');
        }
        if ($coupon->usage_limit !== null && $this->usedCount($coupon) >= $coupon->usage_limit) {
            $fail('This voucher has been fully redeemed.');
        }

        if ($user) {
            $mine = CouponRedemption::where('coupon_id', $coupon->id)->where('user_id', $user->id)
                ->whereIn('status', ['reserved', 'redeemed'])->count();
            if ($mine >= max(1, (int) $coupon->per_user_limit)) {
                $fail('You have already used this voucher.');
            }
            if ($coupon->first_order_only && Order::where('user_id', $user->id)->where('payment_status', 'paid')->exists()) {
                $fail('This voucher is for your first order only.');
            }
        } elseif ($coupon->first_order_only) {
            $fail('Sign in to use this voucher.');
        }

        $categoryIds = $coupon->category_id
            ? Category::where('id', $coupon->category_id)->orWhere('parent_id', $coupon->category_id)->pluck('id')->all()
            : null;

        $eligibleByStore = [];
        foreach ($lines as $line) {
            if ($coupon->store_id && (int) $line['store_id'] !== (int) $coupon->store_id) {
                continue;
            }
            if ($categoryIds !== null && ! in_array((int) ($line['category_id'] ?? 0), $categoryIds, true)) {
                continue;
            }
            $eligibleByStore[$line['store_id']] = ($eligibleByStore[$line['store_id']] ?? 0) + (float) $line['total'];
        }

        $eligible = array_sum($eligibleByStore);
        if ($eligible <= 0) {
            $fail('This voucher does not apply to the items in your cart.');
        }
        if ($coupon->min_order && $eligible < (float) $coupon->min_order) {
            $fail('Spend at least ₦'.number_format((float) $coupon->min_order).' on eligible items to use this voucher.');
        }

        $freeShipping = $coupon->type === 'free_shipping';
        $discount = match ($coupon->type) {
            'percent' => $eligible * min(100, (float) $coupon->value) / 100,
            'fixed' => min((float) $coupon->value, $eligible),
            'free_shipping' => array_sum(array_intersect_key($shipping, $eligibleByStore)),
            default => 0,
        };
        if ($coupon->max_discount !== null && $coupon->type !== 'free_shipping') {
            $discount = min($discount, (float) $coupon->max_discount);
        }
        $discount = round(max(0, $discount), 2);

        // Spread the discount across sellers in proportion to their eligible spend.
        $perStore = [];
        $allocated = 0;
        $storeIds = array_keys($eligibleByStore);
        foreach ($storeIds as $i => $storeId) {
            if ($freeShipping) {
                $share = (float) ($shipping[$storeId] ?? 0);
            } elseif ($i === count($storeIds) - 1) {
                $share = round($discount - $allocated, 2);
            } else {
                $share = round($discount * $eligibleByStore[$storeId] / $eligible, 2);
            }
            $perStore[$storeId] = $share;
            $allocated += $share;
        }

        return ['coupon' => $coupon, 'discount' => $discount, 'per_store' => $perStore, 'free_shipping' => $freeShipping];
    }

    public function usedCount(Coupon $coupon): int
    {
        return CouponRedemption::where('coupon_id', $coupon->id)->whereIn('status', ['reserved', 'redeemed'])->count();
    }

    public function reserve(Coupon $coupon, User $user, Order $order, float $discount): void
    {
        CouponRedemption::create([
            'coupon_id' => $coupon->id,
            'user_id' => $user->id,
            'order_id' => $order->id,
            'discount' => $discount,
            'status' => 'reserved',
        ]);
    }

    public function redeem(Order $order): void
    {
        $rows = CouponRedemption::where('order_id', $order->id)->where('status', 'reserved')->get();
        foreach ($rows as $row) {
            $row->update(['status' => 'redeemed']);
            Coupon::where('id', $row->coupon_id)->increment('used_count');
        }
    }

    public function release(Order $order): void
    {
        CouponRedemption::where('order_id', $order->id)->where('status', 'reserved')->update(['status' => 'released']);
    }
}
