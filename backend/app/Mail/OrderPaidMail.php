<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderPaidMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Order '.$this->order->order_number.' confirmed',
        );
    }

    public function content(): Content
    {
        $total = number_format((float) $this->order->total, 2);

        return new Content(
            htmlString: '<p>Thanks for your order.</p>'
                .'<p>Order <strong>'.e($this->order->order_number).'</strong> is paid and being prepared.</p>'
                .'<p>Total: ₦'.e($total).'</p>'
                .'<p>— Atelier Nigeria</p>',
        );
    }
}
