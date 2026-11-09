<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $token) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset your Atelier Nigeria password',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.password-reset',
            with: [
                'user' => $this->user,
                'token' => $this->token,
            ],
        );
    }
}
