<?php

namespace App\Support;

class MailBrand
{
    public static function appName(): string
    {
        return (string) config('app.name', 'Atelier Nigeria');
    }

    public static function frontendUrl(string $path = '/'): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/') . '/' . ltrim($path, '/');
    }

    public static function backendUrl(string $path = '/'): string
    {
        return rtrim((string) config('app.url'), '/') . '/' . ltrim($path, '/');
    }

    public static function logoUrl(): string
    {
        return self::backendUrl('/brand/logo-header-hd.png');
    }

    public static function logoLightUrl(): string
    {
        return self::backendUrl('/brand/logo-footer-hd.png');
    }

    public static function fromAddress(): string
    {
        return (string) config('mail.from.address', 'hello@atelierstore.studio');
    }

    /**
     * Public “Questions?” address shown in email footers.
     * Always reads MAIL_SUPPORT_ADDRESS via config. Never falls back to MAIL_FROM_ADDRESS
     * (SMTP from can be a different mailbox, e.g. a relay account).
     */
    public static function supportEmail(): string
    {
        $support = (string) config('mail.support_address', 'hello@atelierstore.studio');

        return $support !== '' ? $support : 'hello@atelierstore.studio';
    }

    public static function tagline(): string
    {
        return 'Handmade work from makers across Nigeria';
    }
}
