<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\Review;
use App\Models\Wishlist;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function orders(Request $request)
    {
        $orders = Order::with(['subOrders.store', 'subOrders.items.product.images'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['data' => $orders]);
    }

    public function order(Request $request, int $id)
    {
        $order = Order::with(['subOrders.store', 'subOrders.items.product.images'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json(['data' => $order]);
    }

    public function addresses(Request $request)
    {
        return response()->json([
            'data' => Address::where('user_id', $request->user()->id)->latest()->get(),
        ]);
    }

    public function storeAddress(Request $request)
    {
        $data = $request->validate([
            'label' => ['nullable', 'string'],
            'full_name' => ['required', 'string'],
            'phone' => ['required', 'string'],
            'address_line' => ['required', 'string'],
            'city' => ['required', 'string'],
            'state' => ['required', 'string'],
            'country' => ['nullable', 'string'],
            'postal_code' => ['nullable', 'string'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if (! empty($data['is_default'])) {
            Address::where('user_id', $request->user()->id)->update(['is_default' => false]);
        }

        $address = Address::create([
            ...$data,
            'user_id' => $request->user()->id,
            'country' => $data['country'] ?? 'Nigeria',
        ]);

        return response()->json(['data' => $address], 201);
    }

    public function wishlist(Request $request)
    {
        $items = Wishlist::with('product.images', 'product.store')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['data' => $items]);
    }

    public function toggleWishlist(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $existing = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $data['product_id'])
            ->first();

        if ($existing) {
            $existing->delete();

            return response()->json(['data' => ['wishlisted' => false]]);
        }

        Wishlist::create([
            'user_id' => $request->user()->id,
            'product_id' => $data['product_id'],
        ]);

        return response()->json(['data' => ['wishlisted' => true]]);
    }

    public function review(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
        ]);

        $review = Review::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'product_id' => $data['product_id'],
            ],
            [
                'rating' => $data['rating'],
                'comment' => $data['comment'] ?? null,
            ]
        );

        $product = $review->product;
        $product->rating = round($product->reviews()->avg('rating'), 2);
        $product->reviews_count = $product->reviews()->count();
        $product->save();

        return response()->json(['data' => $review], 201);
    }

    public function profile(Request $request)
    {
        if ($request->isMethod('get')) {
            return response()->json(['data' => $request->user()]);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'avatar' => ['nullable', 'string'],
        ]);

        $request->user()->update($data);

        return response()->json(['data' => $request->user()->fresh()]);
    }
}
