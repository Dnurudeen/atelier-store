<?php

namespace Tests\Unit;

use App\Mail\OrderPaidMail;
use App\Mail\PasswordResetMail;
use App\Mail\VendorStatusMail;
use App\Mail\WelcomeUserMail;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class MailBrandTemplateTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_welcome_mail_includes_logo_and_signature(): void
    {
        $user = $this->makeUser(['name' => 'Ada Okonkwo']);
        $html = (new WelcomeUserMail($user))->render();

        $this->assertStringContainsString('logo-header-hd.png', $html);
        $this->assertStringContainsString('logo-footer-hd.png', $html);
        $this->assertStringContainsString('The Atelier Nigeria team', $html);
        $this->assertStringContainsString('Ada Okonkwo', $html);
    }

    public function test_transactional_mails_render_branded_layout(): void
    {
        $buyer = $this->makeUser();
        $order = Order::create([
            'order_number' => 'ATL-TEST001',
            'user_id' => $buyer->id,
            'status' => 'processing',
            'payment_status' => 'paid',
            'subtotal' => 10000,
            'shipping_total' => 0,
            'total' => 10000,
        ]);

        [, $store] = $this->makeVendor();
        $store->setRelation('user', User::find($store->user_id));

        $orderHtml = (new OrderPaidMail($order))->render();
        $vendorHtml = (new VendorStatusMail($store, 'approved'))->render();
        $resetHtml = (new PasswordResetMail($buyer, 'reset-token-abc'))->render();

        foreach ([$orderHtml, $vendorHtml, $resetHtml] as $html) {
            $this->assertStringContainsString('logo-header-hd.png', $html);
            $this->assertStringContainsString('With care,', $html);
            $this->assertStringContainsString('Atelier Nigeria', $html);
        }

        $this->assertStringContainsString('ATL-TEST001', $orderHtml);
        $this->assertStringContainsString('reset-token-abc', $resetHtml);
    }
}
