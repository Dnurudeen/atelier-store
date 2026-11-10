<?php

namespace App\Services;

use App\Models\Review;
use App\Models\Store;
use App\Models\SubOrder;

class SellerScoreService
{
    public function forStore(Store $store): array
    {
        $since = now()->subWeeks(4);

        $orders = SubOrder::query()
            ->with('order')
            ->where('store_id', $store->id)
            ->where('created_at', '>=', $since)
            ->whereHas('order', fn ($query) => $query->where('payment_status', 'paid'))
            ->get();

        if ($orders->isEmpty()) {
            return [
                'score' => null,
                'shipping_speed' => null,
                'customer_rating' => null,
                'cancellation_rate' => null,
                'return_rate' => null,
                'orders' => 0,
            ];
        }

        $onTime = $orders->filter(function (SubOrder $subOrder) {
            $shippedAt = $subOrder->shipped_at ?? $subOrder->delivered_at;
            if (! $shippedAt || ! $subOrder->order) {
                return false;
            }

            return $shippedAt->lte($subOrder->order->created_at->copy()->addDays(2));
        })->count();

        $shippingSpeed = round($onTime / $orders->count(), 4);

        $customerRating = Review::query()
            ->where('created_at', '>=', $since)
            ->whereHas('product', fn ($query) => $query->where('store_id', $store->id))
            ->avg('rating');
        $customerRating = $customerRating !== null ? round((float) $customerRating, 2) : null;

        $cancellationRate = round(
            $orders->where('status', 'cancelled')->count() / $orders->count(),
            4
        );

        $finished = $orders->filter(function (SubOrder $subOrder) {
            return in_array($subOrder->status, ['delivered', 'completed', 'returned'], true)
                || $subOrder->returned_at !== null;
        });
        $returned = $finished->filter(function (SubOrder $subOrder) {
            return $subOrder->status === 'returned' || $subOrder->returned_at !== null;
        });
        $returnRate = $finished->isEmpty()
            ? 0.0
            : round($returned->count() / $finished->count(), 4);

        $parts = [
            $shippingSpeed * 5,
            (1 - $cancellationRate) * 5,
            (1 - $returnRate) * 5,
        ];
        if ($customerRating !== null) {
            $parts[] = $customerRating;
        }

        return [
            'score' => round(array_sum($parts) / count($parts), 1),
            'shipping_speed' => $shippingSpeed,
            'customer_rating' => $customerRating,
            'cancellation_rate' => $cancellationRate,
            'return_rate' => $returnRate,
            'orders' => $orders->count(),
        ];
    }
}
