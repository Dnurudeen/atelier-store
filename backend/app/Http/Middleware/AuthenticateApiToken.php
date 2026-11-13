<?php

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use Closure;
use Illuminate\Http\Request;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next)
    {
        $plain = $request->bearerToken();
        $token = $plain ? PersonalAccessToken::findToken($plain) : null;
        $user = $token?->user;

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->status === 'suspended') {
            return response()->json(['message' => 'Your account has been suspended. Contact support.', 'code' => 'account_suspended'], 403);
        }

        // Touch at most every few minutes to avoid a write on every request.
        if (! $token->last_used_at || $token->last_used_at->lt(now()->subMinutes(5))) {
            $token->forceFill(['last_used_at' => now()])->saveQuietly();
        }

        $request->attributes->set('access_token', $token);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
