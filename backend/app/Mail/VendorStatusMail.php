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
            subject: 'Your Atelier store was '.$label,
        );
    }

    public function content(): Content
    {
        $message = match ($this->status) {
            'approved' => 'Congratulations! '.e($this->store->name).' is approved. You can list products from your vendor dashboard.',
            'rejected' => 'We could not approve '.e($this->store->name).' at this time. Reply to this email if you have questions.',
            'suspended' => e($this->store->name).' has been suspended. Contact support for details.',
            default => e($this->store->name).' status is now '.e($this->status).'.',
        };

        return new Content(
            htmlString: '<p>Hi '.e($this->store->user?->name ?? 'maker').',</p>'
                .'<p>'.$message.'</p>'
                .'<p>— Atelier Nigeria</p>',
        );
    }
}
