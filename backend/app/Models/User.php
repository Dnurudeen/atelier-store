<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

#[Fillable([
    'name',
    'email',
    'password',
    'phone',
    'avatar',
    'role',
    'status',
    'newsletter_opt_in',
    'google_id',
    'onboarding_completed_at',
    'last_login_at',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'newsletter_opt_in' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /** Issue a new device token. Returns the plain-text bearer token (shown once). */
    public function createToken(string $name = 'web', ?int $days = 30): string
    {
        $secret = Str::random(48);
        $token = $this->tokens()->create([
            'name' => mb_substr($name, 0, 120),
            'token' => hash('sha256', $secret),
            'expires_at' => $days ? now()->addDays($days) : null,
        ]);

        return $token->id.'|'.$secret;
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(PersonalAccessToken::class);
    }

    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }

    public function needsOnboarding(): bool
    {
        return $this->onboarding_completed_at === null;
    }

    public function store(): HasOne
    {
        return $this->hasOne(Store::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isVendor(): bool
    {
        return $this->role === 'vendor';
    }
}
