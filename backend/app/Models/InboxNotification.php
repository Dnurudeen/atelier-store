<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InboxNotification extends Model
{
    protected $table = 'notifications_inbox';

    protected $fillable = ['user_id', 'type', 'title', 'body', 'link', 'read_at'];

    protected $casts = ['read_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function notify(?int $userId, string $type, string $title, ?string $body = null, ?string $link = null): void
    {
        if (! $userId) {
            return;
        }

        static::create(compact('type', 'title', 'body', 'link') + ['user_id' => $userId]);
    }
}
