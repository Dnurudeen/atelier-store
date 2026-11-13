<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Mail\VerifyEmailMail;
use App\Mail\WelcomeUserMail;
use App\Models\Store;
use App\Models\User;
use App\Services\GoogleAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthController extends Controller
{
    public const RESET_TTL_MINUTES = 60;

    public const VERIFY_TTL_HOURS = 48;

    public function __construct(private GoogleAuthService $googleAuth) {}

    public static function passwordRule(): Password
    {
        return Password::min(8)->letters()->numbers();
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', self::passwordRule()],
            'role' => ['nullable', 'in:customer,vendor'],
            'phone' => ['nullable', 'string', 'max:30'],
            'store_name' => ['nullable', 'string', 'max:120'],
            'newsletter_opt_in' => ['sometimes', 'boolean'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $role = $data['role'] ?? 'customer';

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => $role,
            'newsletter_opt_in' => (bool) ($data['newsletter_opt_in'] ?? false),
            'onboarding_completed_at' => now(),
            'last_login_at' => now(),
        ]);

        if ($role === 'vendor') {
            $this->ensureVendorStore($user, $data['store_name'] ?? null);
        }

        $this->safeMail($user->email, new WelcomeUserMail($user));
        $this->sendVerification($user);

        return response()->json([
            'data' => [
                'user' => $this->transformUser($user->fresh('store')),
                'token' => $user->createToken($this->deviceName($request)),
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $user = User::where('email', strtolower($data['email']))->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The email or password is incorrect.'],
            ]);
        }

        $this->assertActive($user);
        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'data' => [
                'user' => $this->transformUser($user->load('store')),
                'token' => $user->createToken($this->deviceName($request)),
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
            ->orWhere('email', strtolower($google['email']))
            ->first();

        if (! $user) {
            $isNew = true;
            $role = $data['role'] ?? 'customer';

            $user = User::create([
                'name' => $google['name'],
                'email' => strtolower($google['email']),
                'google_id' => $google['google_id'],
                'avatar' => $google['avatar'],
                'password' => Hash::make(Str::random(40)),
                'role' => $role,
                'onboarding_completed_at' => null,
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();

            if ($role === 'vendor') {
                $this->ensureVendorStore($user);
            }

            $this->safeMail($user->email, new WelcomeUserMail($user));
        } else {
            $this->assertActive($user);
            $user->google_id = $user->google_id ?: $google['google_id'];
            $user->avatar = $user->avatar ?: $google['avatar'];
            $user->email_verified_at = $user->email_verified_at ?: now();

            if ($user->onboarding_completed_at === null && $user->phone) {
                $user->onboarding_completed_at = now();
            }
            $user->save();
        }

        $user->forceFill(['last_login_at' => now()])->save();
        $user = $user->fresh('store');

        return response()->json([
            'data' => [
                'user' => $this->transformUser($user),
                'token' => $user->createToken($this->deviceName($request)),
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
        $request->attributes->get('access_token')?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    /** Sign out of every device (e.g. after a lost phone). Keeps the current session unless asked. */
    public function logoutAll(Request $request)
    {
        $keep = $request->boolean('keep_current') ? $request->attributes->get('access_token')?->id : null;
        $request->user()->tokens()->when($keep, fn ($q) => $q->where('id', '!=', $keep))->delete();

        return response()->json(['message' => 'Signed out of all other devices.']);
    }

    public function sessions(Request $request)
    {
        $current = $request->attributes->get('access_token')?->id;

        return response()->json([
            'data' => $request->user()->tokens()
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->latest('last_used_at')
                ->get(['id', 'name', 'last_used_at', 'created_at', 'expires_at'])
                ->map(fn ($t) => [...$t->toArray(), 'current' => $t->id === $current]),
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', self::passwordRule(), 'different:current_password'],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Your current password is incorrect.'],
            ]);
        }

        $user->password = $data['password'];
        $user->save();

        // Sign out everywhere else.
        $current = $request->attributes->get('access_token')?->id;
        $user->tokens()->where('id', '!=', $current)->delete();

        return response()->json(['message' => 'Password updated.']);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();
        $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages(['password' => ['Your password is incorrect.']]);
        }

        if ($user->isAdmin() || $user->store()->exists()) {
            return response()->json([
                'message' => 'Seller and admin accounts must be closed by support so open orders and payouts can be settled.',
            ], 422);
        }

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->addresses()->delete();
            $user->wishlists()->delete();
            // Orders are kept for accounting, but personal details are removed.
            $user->forceFill([
                'name' => 'Deleted customer',
                'email' => 'deleted+'.$user->id.'.'.Str::lower(Str::random(6)).'@deleted.invalid',
                'phone' => null,
                'avatar' => null,
                'google_id' => null,
                'password' => Hash::make(Str::random(40)),
                'status' => 'deleted',
                'newsletter_opt_in' => false,
            ])->save();
        });

        return response()->json(['message' => 'Your account has been closed.']);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', strtolower($data['email']))->where('status', '!=', 'deleted')->first();

        if ($user) {
            $plain = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($plain), 'created_at' => now()]
            );

            $this->safeMail($user->email, new PasswordResetMail($user, $plain));
        }

        return response()->json([
            'message' => 'If that email has an account, a reset link is on its way.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', self::passwordRule()],
        ]);

        $email = strtolower($data['email']);
        $row = DB::table('password_reset_tokens')->where('email', $email)->first();

        $expired = $row && now()->subMinutes(self::RESET_TTL_MINUTES)->gt($row->created_at);
        if (! $row || $expired || ! Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages([
                'token' => ['This reset link is invalid or has expired. Request a new one.'],
            ]);
        }

        $user = User::where('email', $email)->firstOrFail();
        $user->password = $data['password'];
        // Whoever reset the password owns the inbox.
        $user->email_verified_at ??= now();
        $user->save();
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json(['message' => 'Password updated. You can sign in now.']);
    }

    public function verifyEmail(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
        ]);

        $email = strtolower($data['email']);
        $row = DB::table('email_verification_tokens')->where('email', $email)->first();
        $expired = $row && now()->subHours(self::VERIFY_TTL_HOURS)->gt($row->created_at);

        if (! $row || $expired || ! Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages([
                'token' => ['This verification link is invalid or has expired.'],
            ]);
        }

        $user = User::where('email', $email)->firstOrFail();
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save();
        DB::table('email_verification_tokens')->where('email', $email)->delete();

        return response()->json([
            'message' => 'Email verified. Thank you!',
            'data' => $this->transformUser($user->fresh('store')),
        ]);
    }

    public function resendVerification(Request $request)
    {
        $user = $request->user();
        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email is already verified.']);
        }

        $this->sendVerification($user);

        return response()->json(['message' => 'We sent a new verification link to '.$user->email.'.']);
    }

    private function sendVerification(User $user): void
    {
        $plain = Str::random(64);
        DB::table('email_verification_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($plain), 'created_at' => now()]
        );

        $this->safeMail($user->email, new VerifyEmailMail($user, $plain));
    }

    private function assertActive(User $user): void
    {
        if ($user->status === 'suspended') {
            throw ValidationException::withMessages([
                'email' => ['This account has been suspended. Contact support for help.'],
            ]);
        }
        if ($user->status === 'deleted') {
            throw ValidationException::withMessages([
                'email' => ['The email or password is incorrect.'],
            ]);
        }
    }

    private function deviceName(Request $request): string
    {
        $name = (string) ($request->input('device_name') ?: $request->userAgent() ?: 'web');

        return mb_substr($name, 0, 120);
    }

    private function safeMail(string $to, $mailable): void
    {
        try {
            Mail::to($to)->send($mailable);
        } catch (\Throwable $e) {
            Log::warning('Mail failed', ['to' => $to, 'mail' => $mailable::class, 'error' => $e->getMessage()]);
        }
    }

    private function ensureVendorStore(User $user, ?string $storeName = null): void
    {
        if ($user->store()->exists()) {
            return;
        }

        $name = $storeName ?: $user->name."'s Studio";

        Store::create([
            'user_id' => $user->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'status' => 'pending',
            'shipping_fee' => 2500,
        ]);
    }

    public static function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'roles' => [$user->role],
            'status' => $user->status ?? 'active',
            'store' => $user->store?->withPrivateDetails(),
            'has_google' => (bool) $user->google_id,
            'email_verified' => $user->hasVerifiedEmail(),
            'newsletter_opt_in' => (bool) $user->newsletter_opt_in,
            'needs_onboarding' => $user->needsOnboarding(),
            'created_at' => $user->created_at,
        ];
    }
}
