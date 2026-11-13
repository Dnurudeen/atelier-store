<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Seller Center access.
 *
 * - The user must be a vendor (or an admin who owns a store).
 * - Until the store is approved the seller can look around and edit store settings,
 *   but cannot list products, fulfil orders or buy sponsorships.
 */
class EnsureVendor
{
    /** Write endpoints that remain open while a store is pending review. */
    private const ALLOWED_WHILE_PENDING = ['api/v1/vendor/settings', 'api/v1/vendor/uploads'];

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user || (! $user->isVendor() && ! $user->isAdmin())) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $store = $user->store;
        if (! $store) {
            return response()->json([
                'message' => 'Set up your store to use the Seller Center.',
                'code' => 'store_missing',
            ], 403);
        }

        $isRead = in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);
        if (! $isRead && ! $store->isApproved() && ! $request->is(...self::ALLOWED_WHILE_PENDING)) {
            $message = match ($store->status) {
                'suspended' => 'Your store is suspended. Contact support to restore selling.',
                'rejected' => 'Your store application was not approved. Update your details and contact support.',
                default => 'Your store is awaiting approval. You can list products once it is approved.',
            };

            return response()->json(['message' => $message, 'code' => 'store_'.$store->status], 403);
        }

        return $next($request);
    }
}
