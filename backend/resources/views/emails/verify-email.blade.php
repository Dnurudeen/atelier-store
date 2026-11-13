@extends('emails.layout', [
    'title' => 'Confirm your email',
    'preheader' => 'One click to confirm your Atelier Nigeria email address.',
    'eyebrow' => 'Account',
])

@section('content')
    <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e0313a;font-weight:700;">
        Confirm your email
    </p>
    <h1
        style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;color:#5c0a14;">
        Hi {{ $user->name }}, is this you?
    </h1>
    <p style="margin:0 0 24px 0;">
        Please confirm this email address so we can send your order updates and receipts. The link is valid for 48 hours.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
        <tr>
            <td align="center" style="border-radius:999px;background-color:#e0313a;">
                <a href="{{ $url }}"
                    style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                    Confirm email
                </a>
            </td>
        </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#6b6b6b;word-break:break-all;">
        Button not working? Paste this link into your browser:<br>{{ $url }}
    </p>
@endsection
