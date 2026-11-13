<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersonalAccessToken extends Model
{
    protected $fillable = ['user_id', 'name', 'token', 'last_used_at', 'expires_at'];

    protected $hidden = ['token'];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Resolve a "{id}|{secret}" bearer token to a live token row. */
    public static function findToken(string $plain): ?self
    {
        if (! str_contains($plain, '|')) {
            return null;
        }

        [$id, $secret] = explode('|', $plain, 2);
        if (! ctype_digit($id) || $secret === '') {
            return null;
        }

        $token = static::with('user')->find((int) $id);
        if (! $token || ! hash_equals($token->token, hash('sha256', $secret))) {
            return null;
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            return null;
        }

        return $token;
    }
}
