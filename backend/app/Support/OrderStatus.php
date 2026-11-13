<?php

namespace App\Support;

/**
 * Sub-order (per-seller shipment) lifecycle.
 *
 * pending   – created at checkout, awaiting payment (stock reserved)
 * paid      – payment confirmed, waiting for the seller
 * processing– seller is packing the order
 * shipped   – handed to the courier
 * delivered – received by the customer (counts toward seller earnings)
 * cancelled – cancelled before shipping (stock released, refund due if paid)
 * returned  – returned after delivery (earning clawed back)
 * expired   – unpaid checkout that timed out (stock released)
 */
final class OrderStatus
{
    public const PENDING = 'pending';
    public const PAID = 'paid';
    public const PROCESSING = 'processing';
    public const SHIPPED = 'shipped';
    public const DELIVERED = 'delivered';
    public const CANCELLED = 'cancelled';
    public const RETURNED = 'returned';
    public const EXPIRED = 'expired';

    /** Statuses after which nothing else can happen. */
    public const TERMINAL = [self::CANCELLED, self::RETURNED, self::EXPIRED];

    /** Statuses a seller has earned money on. */
    public const EARNED = [self::DELIVERED, 'completed'];

    /** @var array<string, array<int, string>> */
    private const TRANSITIONS = [
        self::PENDING => [self::CANCELLED, self::EXPIRED],
        self::PAID => [self::PROCESSING, self::SHIPPED, self::DELIVERED, self::CANCELLED],
        self::PROCESSING => [self::SHIPPED, self::DELIVERED, self::CANCELLED],
        self::SHIPPED => [self::DELIVERED, self::RETURNED],
        self::DELIVERED => [self::RETURNED],
        'completed' => [self::RETURNED],
    ];

    /** Statuses a seller may set from the Seller Center. */
    public const VENDOR_SETTABLE = [self::PROCESSING, self::SHIPPED, self::DELIVERED, self::CANCELLED, self::RETURNED];

    public static function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    /** @return array<int, string> */
    public static function nextFor(string $from): array
    {
        return self::TRANSITIONS[$from] ?? [];
    }

    /** Statuses in which the customer may still cancel. */
    public static function customerCancellable(string $status): bool
    {
        return in_array($status, [self::PENDING, self::PAID, self::PROCESSING], true);
    }

    /**
     * Roll per-seller statuses up into one customer-facing order status.
     *
     * @param  array<int, string>  $statuses
     */
    public static function rollUp(array $statuses, string $paymentStatus): string
    {
        $statuses = array_values(array_map(fn ($s) => $s === 'completed' ? self::DELIVERED : $s, $statuses));
        if ($statuses === []) {
            return self::PENDING;
        }

        $live = array_values(array_diff($statuses, [self::CANCELLED, self::EXPIRED]));

        if ($live === []) {
            return in_array(self::EXPIRED, $statuses, true) && ! in_array(self::CANCELLED, $statuses, true)
                ? self::EXPIRED
                : self::CANCELLED;
        }

        if ($paymentStatus !== 'paid') {
            return self::PENDING;
        }

        $unique = array_values(array_unique($live));
        if ($unique === [self::RETURNED]) {
            return self::RETURNED;
        }

        $done = array_diff($live, [self::DELIVERED, self::RETURNED]);
        if ($done === []) {
            return self::DELIVERED;
        }

        if (in_array(self::SHIPPED, $live, true) || in_array(self::DELIVERED, $live, true)) {
            return self::SHIPPED;
        }

        return self::PROCESSING;
    }
}
