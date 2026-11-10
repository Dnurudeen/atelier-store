<?php

namespace Tests\Feature;

use App\Models\Payout;
use App\Models\Review;
use App\Models\Sponsorship;
use App\Models\Statement;
use App\Services\SellerScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class MarketplaceRulesTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_seller_score_counts_speed_cancellations_and_returns(): void
    {
        [, $store] = $this->makeVendor();
        $product = $this->makeProduct($store, null, ['price' => 20000]);
        $buyer = $this->makeUser();

        $this->paidSubOrder($buyer, $product, [
            'status' => 'delivered',
            'shipped_at' => now(),
            'delivered_at' => now(),
        ]);
        $this->paidSubOrder($buyer, $product, [
            'status' => 'cancelled',
        ]);
        $this->paidSubOrder($buyer, $product, [
            'status' => 'returned',
            'shipped_at' => now()->subDays(5),
            'delivered_at' => now()->subDays(4),
            'returned_at' => now(),
        ]);

        Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 4,
            'comment' => 'Lovely',
        ]);

        $score = app(SellerScoreService::class)->forStore($store->fresh());

        $this->assertSame(3, $score['orders']);
        $this->assertEqualsWithDelta(2 / 3, $score['shipping_speed'], 0.001);
        $this->assertEqualsWithDelta(1 / 3, $score['cancellation_rate'], 0.001);
        $this->assertEqualsWithDelta(0.5, $score['return_rate'], 0.001);
        $this->assertSame(4.0, $score['customer_rating']);
        $this->assertNotNull($score['score']);
        $this->assertGreaterThan(1, $score['score']);
        $this->assertLessThanOrEqual(5, $score['score']);
    }

    public function test_pending_balance_moves_only_after_delivery_and_week_close(): void
    {
        config(['services.paystack.secret' => '']);
        $this->withCommission(10);

        [$vendor, $store] = $this->makeVendor(['shipping_fee' => 0]);
        $buyer = $this->makeUser();
        $admin = $this->makeAdmin();
        $product = $this->makeProduct($store, null, ['price' => 10000, 'status' => 'published']);
        $other = $this->makeProduct($store, null, ['price' => 8000, 'name' => 'Other piece', 'status' => 'published']);

        $reference = $this->withHeaders($this->authHeaders($buyer))->postJson('/api/v1/checkout', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'shipping_address' => [
                'full_name' => 'Ada',
                'phone' => '0801',
                'address_line' => 'Street',
                'city' => 'Lagos',
                'state' => 'Lagos',
            ],
        ])->json('data.reference');

        $this->postJson('/api/v1/webhooks/paystack', [
            'event' => 'charge.success',
            'data' => ['reference' => $reference],
        ])->assertOk();

        $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/statements')
            ->assertOk()
            ->assertJsonPath('data.pending', 0);

        $cancelled = $this->paidSubOrder($buyer, $other, [
            'status' => 'cancelled',
            'vendor_earning' => 7200,
            'commission' => 800,
        ]);
        $this->assertSame('cancelled', $cancelled->status);

        $subOrderId = \App\Models\SubOrder::where('status', 'paid')->first()->id;
        $this->withHeaders($this->authHeaders($vendor))
            ->putJson('/api/v1/vendor/orders/'.$subOrderId, ['status' => 'delivered'])
            ->assertOk();

        $beforeSponsor = $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/statements')
            ->assertOk()
            ->json('data.pending');
        $this->assertSame(9000.0, (float) $beforeSponsor);

        $this->withHeaders($this->authHeaders($vendor))
            ->postJson('/api/v1/vendor/sponsorships', [
                'product_id' => $product->id,
                'budget' => 1500,
                'daily_amount' => 500,
            ])
            ->assertCreated();

        $afterSponsor = $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/statements')
            ->json('data.pending');
        $this->assertSame(8500.0, (float) $afterSponsor);
        $this->assertSame('active', Sponsorship::first()->status);
        $this->assertSame(500.0, (float) Sponsorship::first()->spent);

        $this->withHeaders($this->authHeaders($admin))
            ->postJson('/api/v1/admin/statements/close')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.net', '8500.00');

        $this->assertSame(1, Statement::count());
        $this->assertSame(1, Payout::count());
        $this->assertSame('pending', Payout::first()->status);
        $this->assertSame(8500.0, (float) Payout::first()->amount);

        $this->withHeaders($this->authHeaders($vendor))
            ->getJson('/api/v1/vendor/statements')
            ->assertOk()
            ->assertJsonPath('data.pending', 0);
    }
}
