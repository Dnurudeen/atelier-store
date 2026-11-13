<?php

use App\Services\OrderService;
use App\Services\SponsorshipService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('orders:expire-pending {--minutes=30}', function (OrderService $orders) {
    $count = $orders->expireStalePending((int) $this->option('minutes'));
    $this->info("Expired {$count} unpaid order(s).");
})->purpose('Release stock held by checkouts that were never paid');

Artisan::command('sponsorships:accrue', function (SponsorshipService $sponsorships) {
    $sponsorships->accrueAll();
    $this->info('Sponsorship charges accrued.');
})->purpose('Bill active sponsored listings for elapsed days');

Schedule::command('orders:expire-pending')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('sponsorships:accrue')->hourly()->withoutOverlapping();
