<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WelcomeUserMail;
use App\Models\Store;
use App\Models\User;
use App\Services\GoogleAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthController extends Controller
{
    public function __construct(private GoogleAuthService $googleAuth) {}

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
            'onboarding_completed_at' => now(),
        ]);

        if ($role === 'vendor') {
            $this->ensureVendorStore($user);
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

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
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

    public function google(Request $request)
    {
        $data = $request->validate([
            'id_token' => ['required', 'string'],
            'role' => ['nullable', 'in:customer,vendor'],
        ]);

        try {
            $google = $this->googleAuth->verifyIdToken($data['id_token']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $isNew = false;
        $user = User::where('google_id', $google['google_id'])
            ->orWhere('email', $google['email'])
            ->first();

        if (! $user) {
            $isNew = true;
            $role = $data['role'] ?? 'customer';

            $user = User::create([
                'name' => $google['name'],
                'email' => $google['email'],
                'google_id' => $google['google_id'],
                'avatar' => $google['avatar'],
                'password' => Hash::make(Str::random(40)),
                'role' => $role,
                'email_verified_at' => now(),
                'api_token' => hash('sha256', Str::random(60)),
                'onboarding_completed_at' => null,
            ]);

            if ($role === 'vendor') {
                $this->ensureVendorStore($user);
            }

            try {
                Mail::to($user->email)->send(new WelcomeUserMail($user));
            } catch (\Throwable) {
                //
            }
        } else {
            $user->google_id = $user->google_id ?: $google['google_id'];
            $user->avatar = $user->avatar ?: $google['avatar'];
            $user->email_verified_at = $user->email_verified_at ?: now();
            $user->api_token = hash('sha256', Str::random(60));
            $user->save();

            // Existing email/password users who sign in with Google keep completed onboarding
            // unless they never finished Google onboarding before.
            if ($user->onboarding_completed_at === null && $user->phone) {
                $user->onboarding_completed_at = now();
                $user->save();
            }
        }

        $user = $user->fresh('store');

        return response()->json([
            'data' => [
                'user' => $this->transformUser($user),
                'token' => $user->api_token,
                'is_new' => $isNew,
            ],
        ], $isNew ? 201 : 200);
    }

    public function completeOnboarding(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'role' => ['nullable', 'in:customer,vendor'],
        ]);

        $user->name = $data['name'] ?? $user->name;
        $user->phone = $data['phone'];

        if (($data['role'] ?? null) === 'vendor' && $user->role === 'customer') {
            $user->role = 'vendor';
            $this->ensureVendorStore($user);
        }

        $user->onboarding_completed_at = now();
        $user->save();

        return response()->json([
            'data' => $this->transformUser($user->fresh('store')),
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

    private function ensureVendorStore(User $user): void
    {
        if ($user->store()->exists()) {
            return;
        }

        Store::create([
            'user_id' => $user->id,
            'name' => $user->name."'s Studio",
            'slug' => Str::slug($user->name).'-'.Str::random(4),
            'status' => 'pending',
            'shipping_fee' => 2500,
        ]);
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
            'has_google' => (bool) $user->google_id,
            'needs_onboarding' => $user->needsOnboarding(),
        ];
    }
}
