<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PaystackService
{
    private string $secret;
    private string $base = 'https://api.paystack.co';

    public function __construct()
    {
        $this->secret = (string) config('services.paystack.secret', env('PAYSTACK_SECRET_KEY', ''));
    }

    public function isConfigured(): bool
    {
        return $this->secret !== '';
    }

    public function allowDemo(): bool
    {
        return ! app()->environment('production');
    }

    public function initializeTransaction(array $payload): array
    {
        if (! $this->secret) {
            if (! $this->allowDemo()) {
                throw new RuntimeException('Paystack is not configured.');
            }

            return [
                'status' => true,
                'demo' => true,
                'message' => 'Paystack not configured. Demo mode.',
                'data' => [
                    'authorization_url' => ($payload['callback_url'] ?? '/checkout/success').'?reference='.$payload['reference'].'&demo=1',
                    'access_code' => 'demo_access',
                    'reference' => $payload['reference'],
                ],
            ];
        }

        $response = Http::withToken($this->secret)
            ->post($this->base.'/transaction/initialize', array_filter($payload));

        if (! $response->successful()) {
            Log::warning('Paystack init failed', ['body' => $response->json()]);

            if (! $this->allowDemo()) {
                throw new RuntimeException('Paystack initialization failed.');
            }

            return [
                'status' => false,
                'demo' => true,
                'message' => 'Paystack init failed. Falling back to demo.',
                'data' => [
                    'authorization_url' => ($payload['callback_url'] ?? '/checkout/success').'?reference='.$payload['reference'].'&demo=1',
                    'access_code' => 'demo_access',
                    'reference' => $payload['reference'],
                ],
            ];
        }

        return $response->json();
    }

    public function verifyTransaction(string $reference): array
    {
        if (! $this->secret) {
            if (! $this->allowDemo()) {
                throw new RuntimeException('Paystack is not configured.');
            }

            return [
                'status' => true,
                'demo' => true,
                'data' => ['status' => 'success', 'reference' => $reference],
            ];
        }

        $response = Http::withToken($this->secret)
            ->get($this->base.'/transaction/verify/'.$reference);

        return $response->json();
    }

    public function createSubaccount(array $payload): array
    {
        if (! $this->secret) {
            return [
                'status' => true,
                'demo' => true,
                'data' => [
                    'subaccount_code' => 'ACCT_demo_'.substr(md5(json_encode($payload)), 0, 8),
                ],
            ];
        }

        $response = Http::withToken($this->secret)
            ->post($this->base.'/subaccount', $payload);

        return $response->json();
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        if (! $this->secret) {
            // Never accept unsigned webhooks in production.
            return $this->allowDemo();
        }

        $signature = $request->header('x-paystack-signature');
        $computed = hash_hmac('sha512', $request->getContent(), $this->secret);

        return hash_equals($computed, (string) $signature);
    }
}
