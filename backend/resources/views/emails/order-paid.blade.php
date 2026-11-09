@extends('emails.layout', [
    'title' => 'Order ' . $order->order_number . ' confirmed',
    'preheader' => 'Payment received for order ' . $order->order_number . '.',
    'eyebrow' => 'Order confirmed',
])

@section('content')
    @php
        $total = number_format((float) $order->total, 2);
    @endphp
    <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e0313a;font-weight:700;">
        Payment received
    </p>
    <h1
        style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;color:#5c0a14;">
        Your order is confirmed
    </h1>
    <p style="margin:0 0 16px 0;">
        Thank you for shopping with Atelier Nigeria. Makers will begin preparing your pieces.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="margin:0 0 24px 0;background-color:#faf8f8;border:1px solid #e8e4e4;border-radius:16px;">
        <tr>
            <td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222222;">
                <p style="margin:0 0 8px 0;"><span style="color:#6b6b6b;">Order</span><br><strong
                        style="color:#5c0a14;font-size:16px;">{{ $order->order_number }}</strong></p>
                <p style="margin:0;"><span style="color:#6b6b6b;">Total paid</span><br><strong
                        style="font-size:16px;">₦{{ $total }}</strong></p>
            </td>
        </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="border-radius:999px;background-color:#5c0a14;">
                <a href="{{ \App\Support\MailBrand::frontendUrl('/account/orders') }}"
                    style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                    View your orders
                </a>
            </td>
        </tr>
    </table>
@endsection
