<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureVendor;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:api')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/auth/register', [AuthController::class, 'register']);
        Route::post('/auth/login', [AuthController::class, 'login']);
        Route::post('/auth/google', [AuthController::class, 'google']);
        Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
        Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    });

    Route::get('/home-feed', [CatalogController::class, 'home']);
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/banners', [CatalogController::class, 'banners']);
    Route::get('/products', [CatalogController::class, 'products']);
    Route::get('/products/{slug}', [CatalogController::class, 'product']);
    Route::get('/stores', [CatalogController::class, 'stores']);
    Route::get('/stores/{slug}', [CatalogController::class, 'store']);
    Route::get('/stores/{slug}/products', [CatalogController::class, 'storeProducts']);
    Route::get('/search', [CatalogController::class, 'search']);

    Route::post('/webhooks/paystack', [CheckoutController::class, 'webhook'])->withoutMiddleware('throttle:api');

    Route::middleware([AuthenticateApiToken::class])->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/complete-onboarding', [AuthController::class, 'completeOnboarding']);
        Route::post('/auth/logout-all', [AuthController::class, 'logoutAll']);
        Route::get('/auth/sessions', [AuthController::class, 'sessions']);
        Route::put('/auth/password', [AuthController::class, 'changePassword']);
        Route::delete('/auth/account', [AuthController::class, 'deleteAccount']);
        Route::post('/auth/email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:auth');

        Route::post('/checkout', [CheckoutController::class, 'checkout']);
        Route::get('/payments/verify/{reference}', [CheckoutController::class, 'verify']);

        Route::get('/account/orders', [AccountController::class, 'orders']);
        Route::get('/account/orders/{id}', [AccountController::class, 'order']);
        Route::get('/account/addresses', [AccountController::class, 'addresses']);
        Route::post('/account/addresses', [AccountController::class, 'storeAddress']);
        Route::put('/account/addresses/{id}', [AccountController::class, 'updateAddress']);
        Route::delete('/account/addresses/{id}', [AccountController::class, 'deleteAddress']);
        Route::get('/account/wishlist', [AccountController::class, 'wishlist']);
        Route::post('/account/wishlist', [AccountController::class, 'toggleWishlist']);
        Route::post('/account/reviews', [AccountController::class, 'review']);
        Route::match(['get', 'put'], '/account/profile', [AccountController::class, 'profile']);

        Route::post('/vendor/onboarding', [VendorController::class, 'onboarding']);

        Route::prefix('vendor')->middleware([EnsureVendor::class])->group(function () {
            Route::get('/overview', [VendorController::class, 'overview']);
            Route::get('/products', [VendorController::class, 'products']);
            Route::post('/products', [VendorController::class, 'storeProduct']);
            Route::put('/products/{id}', [VendorController::class, 'updateProduct']);
            Route::get('/orders', [VendorController::class, 'orders']);
            Route::put('/orders/{id}', [VendorController::class, 'updateOrder']);
            Route::get('/earnings', [VendorController::class, 'earnings']);
            Route::get('/statements', [VendorController::class, 'statements']);
            Route::get('/sponsorships', [VendorController::class, 'sponsorships']);
            Route::post('/sponsorships', [VendorController::class, 'storeSponsorship']);
            Route::put('/sponsorships/{id}', [VendorController::class, 'updateSponsorship']);
            Route::put('/settings', [VendorController::class, 'settings']);
        });

        Route::prefix('admin')->middleware([EnsureAdmin::class])->group(function () {
            Route::get('/overview', [AdminController::class, 'overview']);
            Route::get('/vendors', [AdminController::class, 'vendors']);
            Route::put('/vendors/{id}', [AdminController::class, 'updateVendor']);
            Route::get('/products', [AdminController::class, 'products']);
            Route::put('/products/{id}', [AdminController::class, 'updateProduct']);
            Route::get('/orders', [AdminController::class, 'orders']);
            Route::get('/categories', [AdminController::class, 'categories']);
            Route::post('/categories', [AdminController::class, 'storeCategory']);
            Route::get('/banners', [AdminController::class, 'banners']);
            Route::post('/banners', [AdminController::class, 'storeBanner']);
            Route::put('/banners/{id}', [AdminController::class, 'updateBanner']);
            Route::get('/payouts', [AdminController::class, 'payouts']);
            Route::put('/payouts/{id}', [AdminController::class, 'updatePayout']);
            Route::post('/statements/close', [AdminController::class, 'closeStatements']);
            Route::match(['get', 'put'], '/settings', [AdminController::class, 'settings']);
        });
    });
});
