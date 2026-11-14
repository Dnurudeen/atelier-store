@extends('emails.layout', [
    'title' => 'Welcome to ' . \App\Support\MailBrand::appName(),
    'preheader' => 'Your Atelier Nigeria account is ready.',
    'eyebrow' => 'Welcome',
])

@section('content')
    <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e0313a;font-weight:700;">
        Welcome
    </p>
    <h1
        style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;color:#5c0a14;">
        Hi {{ $user->name }}, your account is ready
    </h1>
    <p style="margin:0 0 16px 0;">
        Thanks for joining <strong>Atelier Nigeria</strong>. Here you can buy handmade art, fashion, ceramics,
        leather and home pieces from makers across Nigeria.
    </p>
    <p style="margin:0 0 24px 0;">
        Browse the shop, follow makers you like, or open a store when you are ready to sell.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
        <tr>
            <td align="center" style="border-radius:999px;background-color:#e0313a;">
                <a href="{{ \App\Support\MailBrand::frontendUrl('/shop') }}"
                    style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                    Browse the shop
                </a>
            </td>
        </tr>
    </table>
@endsection
