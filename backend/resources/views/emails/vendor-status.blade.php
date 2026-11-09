@extends('emails.layout', [
    'title' => 'Store update from ' . \App\Support\MailBrand::appName(),
    'preheader' => $store->name . ' was marked ' . $status . '.',
    'eyebrow' => 'Maker update',
])

@section('content')
    @php
        $heading = match ($status) {
            'approved' => 'your store is approved',
            'rejected' => 'we could not approve your store yet',
            'suspended' => 'your store has been suspended',
            default => 'your store status changed',
        };
        $body = match ($status) {
            'approved' => 'Congratulations. ' .
                $store->name .
                ' is live for listing. Add products from your vendor dashboard and start selling.',
            'rejected' => 'We could not approve ' .
                $store->name .
                ' at this time. Reply to this email if you would like guidance on what to update.',
            'suspended' => $store->name .
                ' has been suspended. Contact support if you need clarification or want to appeal.',
            default => $store->name . ' is now marked as ' . $status . '.',
        };
        $ctaHref =
            $status === 'approved'
                ? \App\Support\MailBrand::frontendUrl('/vendor')
                : \App\Support\MailBrand::frontendUrl('/account');
        $ctaLabel = $status === 'approved' ? 'Open vendor dashboard' : 'Go to your account';
    @endphp

    <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e0313a;font-weight:700;">
        Maker studio
    </p>
    <h1
        style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;color:#5c0a14;">
        Hi {{ $store->user?->name ?? 'maker' }}, {{ $heading }}
    </h1>
    <p style="margin:0 0 24px 0;">{{ $body }}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="border-radius:999px;background-color:#e0313a;">
                <a href="{{ $ctaHref }}"
                    style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                    {{ $ctaLabel }}
                </a>
            </td>
        </tr>
    </table>
@endsection
