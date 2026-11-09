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
        return rtrim((string) config('app.frontend_url', config('app.url')), '/').'/'.ltrim($path, '/');
    }

    public static function backendUrl(string $path = '/'): string
    {
        return rtrim((string) config('app.url'), '/').'/'.ltrim($path, '/');
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

    public static function supportEmail(): string
    {
        return (string) env('MAIL_SUPPORT_ADDRESS', self::fromAddress());
    }

    public static function tagline(): string
    {
        return 'Handcrafted excellence from Nigerian makers';
    }
}
