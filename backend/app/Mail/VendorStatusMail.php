<?php

namespace App\Mail;

use App\Models\Store;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VendorStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Store $store, public string $status) {}

    public function envelope(): Envelope
    {
        $label = $this->status === 'approved' ? 'approved' : $this->status;

        return new Envelope(
            subject: 'Your Atelier store was ' . $label,
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.vendor-status',
            with: [
                'store' => $this->store,
                'status' => $this->status,
            ],
        );
    }
}
