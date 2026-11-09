<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleAuthService
{
    public function verifyIdToken(string $idToken): array
    {
        $clientId = (string) config('services.google.client_id');

        if ($clientId === '') {
            throw new RuntimeException('Google sign-in is not configured.');
        }

        $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Invalid Google token.');
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Invalid Google token payload.');
        }

        $audience = $payload['aud'] ?? null;
        if ($audience !== $clientId) {
            throw new RuntimeException('Google token audience mismatch.');
        }

        $email = $payload['email'] ?? null;
        $sub = $payload['sub'] ?? null;
        $verified = $payload['email_verified'] ?? false;

        if (! $email || ! $sub) {
            throw new RuntimeException('Google account is missing email.');
        }

        if (! in_array($verified, [true, 'true', 1, '1'], true)) {
            throw new RuntimeException('Google email is not verified.');
        }

        return [
            'google_id' => (string) $sub,
            'email' => (string) $email,
            'name' => (string) ($payload['name'] ?? strstr($email, '@', true) ?: 'Atelier Member'),
            'avatar' => isset($payload['picture']) ? (string) $payload['picture'] : null,
        ];
    }
}
