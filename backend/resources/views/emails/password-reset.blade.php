@extends('emails.layout', [
    'title' => 'Reset your ' . \App\Support\MailBrand::appName() . ' password',
    'preheader' => 'Use this token to reset your Atelier Nigeria password.',
    'eyebrow' => 'Security',
])

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
    </p>
    <p style="margin:0 0 12px 0;">
        Use this reset token on the password reset page:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="margin:0 0 20px 0;background-color:#faf8f8;border:1px dashed #c9b8ba;border-radius:14px;">
        <tr>
            <td
                style="padding:18px 16px;font-family:Consolas,Monaco,monospace;font-size:13px;line-height:1.5;word-break:break-all;color:#5c0a14;">
                {{ $token }}
            </td>
        </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
        <tr>
            <td align="center" style="border-radius:999px;background-color:#5c0a14;">
                <a href="{{ \App\Support\MailBrand::frontendUrl('/forgot-password') }}"
                    style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                    Open reset page
                </a>
            </td>
        </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#6b6b6b;">
        If you did not request this, you can ignore this email. Your password will stay the same.
    </p>
@endsection
