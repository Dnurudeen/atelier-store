<?php

namespace App\Mail;

use App\Models\User;
use App\Support\MailBrand;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerifyEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $token) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirm your email for '.MailBrand::appName());
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.verify-email',
            with: [
                'user' => $this->user,
                'url' => MailBrand::frontendUrl('/verify-email?'.http_build_query([
                    'email' => $this->user->email,
                    'token' => $this->token,
                ])),
            ],
        );
    }
}
