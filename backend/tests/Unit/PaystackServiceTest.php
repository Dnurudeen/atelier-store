<?php

namespace Tests\Unit;

use App\Services\PaystackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaystackServiceTest extends TestCase
{
    public function test_initialize_falls_back_to_demo_without_secret(): void
    {
        config(['services.paystack.secret' => '']);

        $service = new PaystackService;
        $result = $service->initializeTransaction([
            'reference' => 'atk_test_ref',
            'callback_url' => 'http://localhost:3000/checkout/success',
            'email' => 'buyer@atelier.test',
            'amount' => 500000,
        ]);

        $this->assertTrue($result['status']);
        $this->assertTrue($result['demo']);
        $this->assertStringContainsString('atk_test_ref', $result['data']['authorization_url']);
        $this->assertSame('atk_test_ref', $result['data']['reference']);
    }

    public function test_verify_falls_back_to_demo_without_secret(): void
    {
        config(['services.paystack.secret' => '']);

        $service = new PaystackService;
        $result = $service->verifyTransaction('atk_demo');

        $this->assertTrue($result['demo']);
        $this->assertSame('success', $result['data']['status']);
    }

    public function test_create_subaccount_demo_mode(): void
    {
        config(['services.paystack.secret' => '']);

        $service = new PaystackService;
        $result = $service->createSubaccount([
            'business_name' => 'Adebayo Studio',
            'account_number' => '0123456789',
        ]);

        $this->assertTrue($result['demo']);
        $this->assertStringStartsWith('ACCT_demo_', $result['data']['subaccount_code']);
    }

    public function test_webhook_signature_passes_without_secret(): void
    {
        config(['services.paystack.secret' => '']);

        $service = new PaystackService;
        $request = Request::create('/api/webhooks/paystack', 'POST', [], [], [], [], '{"event":"charge.success"}');

        $this->assertTrue($service->verifyWebhookSignature($request));
    }

    public function test_webhook_signature_validates_hmac_when_secret_present(): void
    {
        config(['services.paystack.secret' => 'sk_test_secret']);

        $body = '{"event":"charge.success"}';
        $signature = hash_hmac('sha512', $body, 'sk_test_secret');

        $service = new PaystackService;
        $request = Request::create('/api/webhooks/paystack', 'POST', [], [], [], [
            'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body);

        $this->assertTrue($service->verifyWebhookSignature($request));

        $bad = Request::create('/api/webhooks/paystack', 'POST', [], [], [], [
            'HTTP_X_PAYSTACK_SIGNATURE' => 'invalid',
            'CONTENT_TYPE' => 'application/json',
        ], $body);

        $this->assertFalse($service->verifyWebhookSignature($bad));
    }

    public function test_initialize_uses_paystack_http_when_secret_present(): void
    {
        config(['services.paystack.secret' => 'sk_test_secret']);

        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data' => [
                    'authorization_url' => 'https://paystack.com/pay/xyz',
                    'access_code' => 'access_xyz',
                    'reference' => 'atk_live',
                ],
            ], 200),
        ]);

        $service = new PaystackService;
        $result = $service->initializeTransaction([
            'reference' => 'atk_live',
            'email' => 'buyer@atelier.test',
            'amount' => 10000,
        ]);

        $this->assertTrue($result['status']);
        $this->assertSame('https://paystack.com/pay/xyz', $result['data']['authorization_url']);
        Http::assertSent(fn ($request) => str_contains($request->url(), '/transaction/initialize'));
    }
}
