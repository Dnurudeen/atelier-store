<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>{{ $title ?? \App\Support\MailBrand::appName() }}</title>
</head>

<body
    style="margin:0;padding:0;background-color:#f7f2f0;color:#111111;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;">
    @php
        $appName = \App\Support\MailBrand::appName();
        $logoUrl = \App\Support\MailBrand::logoUrl();
        $logoLightUrl = \App\Support\MailBrand::logoLightUrl();
        $frontend = rtrim(\App\Support\MailBrand::frontendUrl('/'), '/');
        $support = \App\Support\MailBrand::supportEmail();
        $tagline = \App\Support\MailBrand::tagline();
    @endphp
    @isset($preheader)
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            {{ $preheader }}
        </div>
    @endisset

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="background-color:#f7f2f0;margin:0;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e4e4;box-shadow:0 18px 40px rgba(92,10,20,0.06);">
                    {{-- Brand header --}}
                    <tr>
                        <td
                            style="padding:28px 32px 20px 32px;background:linear-gradient(180deg,#ffffff 0%,#faf8f8 100%);border-bottom:1px solid #e8e4e4;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align:middle;">
                                        <a href="{{ $frontend }}" style="text-decoration:none;">
                                            <img src="{{ $logoUrl }}" alt="{{ $appName }}" width="168"
                                                height="auto"
                                                style="display:block;width:168px;max-width:70%;height:auto;border:0;">
                                        </a>
                                    </td>
                                    <td align="right" style="vertical-align:middle;">
                                        <span
                                            style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#e0313a;font-weight:600;">
                                            {{ $eyebrow ?? 'Atelier Nigeria' }}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Crimson accent --}}
                    <tr>
                        <td
                            style="height:4px;background:linear-gradient(90deg,#5c0a14 0%,#e0313a 55%,#5c0a14 100%);font-size:0;line-height:0;">
                            &nbsp;</td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td
                            style="padding:36px 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#222222;">
                            @yield('content')
                        </td>
                    </tr>

                    {{-- Signature --}}
                    <tr>
                        <td style="padding:0 32px 8px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                                style="border-top:1px solid #e8e4e4;">
                                <tr>
                                    <td style="padding:28px 0 8px 0;font-family:Arial,Helvetica,sans-serif;">
                                        <p style="margin:0 0 4px 0;font-size:13px;color:#6b6b6b;">With care,</p>
                                        <p
                                            style="margin:0 0 2px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#5c0a14;">
                                            The {{ $appName }} team
                                        </p>
                                        <p style="margin:0;font-size:13px;color:#6b6b6b;">{{ $tagline }}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Brand footer band --}}
                    <tr>
                        <td style="background-color:#5c0a14;padding:28px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="padding-bottom:16px;">
                                        <a href="{{ $frontend }}" style="text-decoration:none;">
                                            <img src="{{ $logoLightUrl }}" alt="{{ $appName }}" width="140"
                                                height="auto"
                                                style="display:block;width:140px;max-width:60%;height:auto;border:0;">
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td
                                        style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#f7f2f0;">
                                        <p style="margin:0 0 10px 0;opacity:0.9;">{{ $tagline }}</p>
                                        <p style="margin:0 0 14px 0;">
                                            <a href="{{ $frontend }}/shop"
                                                style="color:#ffffff;text-decoration:underline;margin-right:14px;">Shop</a>
                                            <a href="{{ $frontend }}/makers"
                                                style="color:#ffffff;text-decoration:underline;margin-right:14px;">Makers</a>
                                            <a href="{{ $frontend }}/account"
                                                style="color:#ffffff;text-decoration:underline;">Account</a>
                                        </p>
                                        <p style="margin:0;font-size:12px;opacity:0.75;">
                                            Questions?
                                            <a href="mailto:{{ $support }}"
                                                style="color:#ffffff;text-decoration:underline;">{{ $support }}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="max-width:560px;">
                    <tr>
                        <td align="center"
                            style="padding:20px 12px 8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#8a8080;">
                            You received this email because you have an account with {{ $appName }}.<br>
                            &copy; {{ date('Y') }} {{ $appName }}. All rights reserved.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
