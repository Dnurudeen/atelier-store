@extends('emails.layout', [
    'title' => 'Reset your ' . \App\Support\MailBrand::appName() . ' password',
    'preheader' => 'Use this link to choose a new Atelier Nigeria password. It expires in 60 minutes.',
    'eyebrow' => 'Security',
])

@php
    $resetUrl = \App\Support\MailBrand::frontendUrl('/reset-password?' . http_build_query(['email' => $user->email, 'token' => $token]));
@endphp

@section('content')
    <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e0313a;font-weight:700;">
        Password reset
    </p>
    <h1
        style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;color:#5c0a14;">
        Reset your password
    </h1>
    <p style="margin:0 0 16px 0;">
        Hi {{ $user->name }}, we received a request to reset the password for your Atelier Nigeria account.
        This link expires in 60 minutes.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
        <tr>
            <td align="center" style="border-radius:999px;background-color:#5c0a14;">
                <a href="{{ $resetUrl }}"
                    style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                    Choose a new password
                </a>
            </td>
        </tr>
    </table>
    <p style="margin:0 0 12px 0;font-size:13px;color:#6b6b6b;word-break:break-all;">
        Button not working? Paste this link into your browser:<br>{{ $resetUrl }}
    </p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;">
        If you did not request this, you can ignore this email. Your password will stay the same.
    </p>
@endsection
