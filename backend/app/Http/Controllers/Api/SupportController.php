<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PersonalAccessToken;
use App\Support\MailBrand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SupportController extends Controller
{
    public const TOPICS = ['general', 'order', 'payment', 'returns', 'selling', 'account'];

    /** Public site settings for the storefront (contacts, announcement strip). */
    public function site()
    {
        return response()->json([
            'data' => [
                'support_email' => \App\Models\Setting::getValue('support_email', MailBrand::supportEmail()),
                'support_phone' => \App\Models\Setting::getValue('support_phone'),
                'announcement' => \App\Models\Setting::getValue('announcement'),
            ],
        ]);
    }

    public function newsletter(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email:filter', 'max:190']]);
        $email = strtolower($data['email']);

        $existing = DB::table('newsletter_subscribers')->where('email', $email);
        if ($existing->exists()) {
            $existing->update(['unsubscribed_at' => null, 'updated_at' => now()]);
        } else {
            DB::table('newsletter_subscribers')->insert(['email' => $email, 'source' => 'footer', 'created_at' => now(), 'updated_at' => now()]);
        }

        return response()->json(['message' => "You're subscribed! Watch your inbox for deals and new arrivals."]);
    }

    public function contact(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:filter', 'max:190'],
            'topic' => ['required', 'in:'.implode(',', self::TOPICS)],
            'order_number' => ['nullable', 'string', 'max:40'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        $plain = $request->bearerToken();
        $userId = $plain ? PersonalAccessToken::findToken($plain)?->user_id : null;

        $id = DB::table('contact_messages')->insertGetId([
            ...$data,
            'user_id' => $userId,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            Mail::raw(
                "New {$data['topic']} message #{$id} from {$data['name']} <{$data['email']}>\n"
                .($data['order_number'] ? "Order: {$data['order_number']}\n" : '')
                ."\n{$data['message']}",
                fn ($m) => $m->to(MailBrand::supportEmail())->replyTo($data['email'], $data['name'])->subject("[Atelier support] {$data['topic']} #{$id}")
            );
        } catch (\Throwable $e) {
            Log::warning('Contact mail failed', ['id' => $id, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => 'Thanks for reaching out. Our team will reply within one business day.',
            'data' => ['ticket' => $id],
        ], 201);
    }
}
