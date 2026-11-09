<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WelcomeUserMail;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'role' => ['nullable', 'in:customer,vendor'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $role = $data['role'] ?? 'customer';

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => $role,
            'api_token' => hash('sha256', Str::random(60)),
        ]);

        if ($role === 'vendor') {
            Store::create([
                'user_id' => $user->id,
                'name' => $user->name."'s Studio",
                'slug' => Str::slug($user->name).'-'.Str::random(4),
                'status' => 'pending',
                'shipping_fee' => 2500,
            ]);
        }

        try {
            Mail::to($user->email)->send(new WelcomeUserMail($user));
        } catch (\Throwable) {
            // Do not block signup if mail is misconfigured locally.
        }

        return response()->json([
            'data' => [
                'user' => $this->transformUser($user->fresh('store')),
                'token' => $user->api_token,
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->api_token = hash('sha256', Str::random(60));
        $user->save();

        return response()->json([
            'data' => [
                'user' => $this->transformUser($user->load('store')),
                'token' => $user->api_token,
            ],
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'data' => $this->transformUser($request->user()->load('store')),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->api_token = null;
        $user->save();

        return response()->json(['message' => 'Logged out']);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if ($user) {
            $plain = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($plain), 'created_at' => now()]
            );

            try {
                Mail::raw(
                    "Reset your Atelier Nigeria password with this token:\n\n{$plain}\n\nUse it on the reset password page with your new password.",
                    fn ($message) => $message->to($user->email)->subject('Reset your Atelier password')
                );
            } catch (\Throwable) {
                //
            }
        }

        return response()->json([
            'message' => 'If that email exists, a reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (! $row || ! Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages([
                'token' => ['This reset token is invalid.'],
            ]);
        }

        $user = User::where('email', $data['email'])->firstOrFail();
        $user->password = $data['password'];
        $user->api_token = null;
        $user->save();

        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['message' => 'Password updated. You can sign in now.']);
    }

    private function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'roles' => [$user->role],
            'store' => $user->store,
        ];
    }
}
