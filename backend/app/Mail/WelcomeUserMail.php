<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeUserMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to Atelier Nigeria',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: '<p>Hi '.e($this->user->name).',</p>'
                .'<p>Welcome to Atelier Nigeria. Your account is ready.</p>'
                .'<p>Browse handmade work from Nigerian makers, or open a storefront if you create.</p>'
                .'<p>— Atelier Nigeria</p>',
        );
    }
}
