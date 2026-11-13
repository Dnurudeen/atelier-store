<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // General API traffic: per user when signed in, otherwise per IP.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->bearerToken() ? 'token:'.sha1($request->bearerToken()) : 'ip:'.$request->ip());
        });

        // Sign-in, sign-up and password reset: slow down credential stuffing.
        RateLimiter::for('auth', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return [
                Limit::perMinute(10)->by('auth-ip:'.$request->ip()),
                Limit::perMinute(5)->by('auth-email:'.$email.'|'.$request->ip())->response(fn () => response()->json([
                    'message' => 'Too many attempts. Please wait a minute and try again.',
                ], 429)),
            ];
        });
    }
}
