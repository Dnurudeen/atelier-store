<?php

namespace App\Services;

use App\Models\Sponsorship;
use App\Models\SponsoredCharge;
use App\Models\Store;

class SponsorshipService
{
    public const DEFAULT_DAILY = 500;

    public function __construct(private StatementService $statements) {}

    public function accrueAll(): void
    {
        Sponsorship::query()
            ->where('status', 'active')
            ->with('store')
            ->orderBy('id')
            ->each(fn (Sponsorship $sponsorship) => $this->accrue($sponsorship));
    }

    public function accrueStore(Store $store): void
    {
        Sponsorship::query()
            ->where('store_id', $store->id)
            ->where('status', 'active')
            ->orderBy('id')
            ->each(fn (Sponsorship $sponsorship) => $this->accrue($sponsorship));
    }

    public function accrue(Sponsorship $sponsorship): void
    {
        if ($sponsorship->status !== 'active') {
            return;
        }

        $cursor = $sponsorship->last_charged_on
            ? $sponsorship->last_charged_on->copy()->addDay()->startOfDay()
            : $sponsorship->created_at->copy()->startOfDay();
        $today = now()->startOfDay();

        while ($cursor->lte($today)) {
            $remaining = round((float) $sponsorship->budget - (float) $sponsorship->spent, 2);
            if ($remaining <= 0) {
                $sponsorship->status = 'exhausted';
                $sponsorship->save();

                return;
            }

            $fee = min((float) $sponsorship->daily_amount, $remaining);
            $store = $sponsorship->store ?? $sponsorship->store()->first();
            if (! $store || $this->statements->pending($store) < $fee) {
                return;
            }

            SponsoredCharge::create([
                'sponsorship_id' => $sponsorship->id,
                'store_id' => $sponsorship->store_id,
                'amount' => $fee,
                'charged_on' => $cursor->toDateString(),
            ]);

            $sponsorship->spent = round((float) $sponsorship->spent + $fee, 2);
            $sponsorship->last_charged_on = $cursor->toDateString();
            if ((float) $sponsorship->spent >= (float) $sponsorship->budget) {
                $sponsorship->status = 'exhausted';
            }
            $sponsorship->save();

            if ($sponsorship->status === 'exhausted') {
                return;
            }

            $cursor->addDay();
        }
    }
}
