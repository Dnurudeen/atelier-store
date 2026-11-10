<?php

$base = 'http://127.0.0.1:8000/api/v1';

function call(string $method, string $path, ?string $token = null, ?array $body = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Accept: application/json', 'Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body === null ? null : json_encode($body),
    ]);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode($raw ?: '', true);

    return [$code, is_array($json) ? $json : ['raw' => $raw]];
}

function login(string $email): string
{
    [$code, $json] = call('POST', '/auth/login', null, [
        'email' => $email,
        'password' => 'password',
    ]);
    if ($code !== 200 || empty($json['data']['token'])) {
        fwrite(STDERR, "login failed for {$email} http {$code}\n");
        exit(1);
    }
    echo "login {$email} ok role=" . ($json['data']['user']['role'] ?? '?') . "\n";

    return $json['data']['token'];
}

function say(string $label, bool $ok, string $detail = ''): void
{
    echo ($ok ? 'PASS ' : 'FAIL ') . $label . ($detail !== '' ? ' ' . $detail : '') . "\n";
    if (! $ok) {
        $GLOBALS['failed'] = true;
    }
}

$failed = false;

$customer = login('customer@atelier.ng');
[$code, $polo] = call('GET', '/products/indigo-heritage-polo-2');
$poloId = $polo['data']['id'] ?? null;
say('polo loaded', $code === 200 && $poloId, "id={$poloId} variants=" . count($polo['data']['variants'] ?? []));

[$code, $other] = call('GET', '/products/lagos-twilight-canvas-0');
$otherId = $other['data']['id'] ?? null;
say('reviewed art loaded', $code === 200 && count($other['data']['reviews'] ?? []) > 0, 'reviews=' . count($other['data']['reviews'] ?? []));

[$code, $wish] = call('POST', '/account/wishlist', $customer, ['product_id' => $poloId]);
say('wishlist toggle', $code === 200 && array_key_exists('wishlisted', $wish['data'] ?? []), json_encode($wish['data'] ?? $wish));

[$code, $denied] = call('POST', '/account/reviews', $customer, [
    'product_id' => $otherId,
    'rating' => 4,
    'comment' => 'Should be rejected',
]);
say('review blocked without delivery', $code === 422, $denied['message'] ?? json_encode($denied));

[$code, $allowed] = call('POST', '/account/reviews', $customer, [
    'product_id' => $poloId,
    'rating' => 5,
    'comment' => 'Delivered and exactly the cloth I ordered.',
]);
say('review allowed after delivery', $code === 201, 'rating=' . ($allowed['data']['rating'] ?? 'none'));

$vendor = login('vendor4@atelier.ng');
[$code, $statements] = call('GET', '/vendor/statements', $vendor);
$pendingBefore = (float) ($statements['data']['pending'] ?? -1);
say('pending after delivery', $code === 200 && $pendingBefore > 0, 'pending=' . $pendingBefore . ' sales=' . ($statements['data']['sales'] ?? '?'));

[$code, $cats] = call('GET', '/categories');
$fashion = null;
foreach ($cats['data'] ?? [] as $cat) {
    if (($cat['slug'] ?? '') === 'fashion') {
        $fashion = $cat['id'];
    }
}
[$code, $created] = call('POST', '/vendor/products', $vendor, [
    'name' => 'Verify Adire Shirt',
    'description' => 'Pending listing from verification.',
    'price' => 18000,
    'stock' => 4,
    'category_id' => $fashion,
    'sizes' => ['S', 'M'],
    'colors' => ['Indigo', 'White'],
    'specs' => ['materials' => 'Cotton adire'],
    'status' => 'published',
]);
$new = $created['data'] ?? [];
say('new product stays pending', $code === 201 && ($new['status'] ?? '') === 'pending', 'status=' . ($new['status'] ?? 'missing') . ' variants=' . count($new['variants'] ?? []));

[$code, $products] = call('GET', '/vendor/products', $vendor);
$published = null;
foreach ($products['data'] ?? [] as $product) {
    if (($product['status'] ?? '') === 'published') {
        $published = $product;
        break;
    }
}
say('vendor has a published product', $published !== null, 'id=' . ($published['id'] ?? 'none'));

[$code, $priced] = call('PUT', '/vendor/products/' . $published['id'], $vendor, [
    'stock' => 9,
    'price' => $published['price'],
    'compare_at_price' => round(((float) $published['price']) * 1.2, 2),
    'sale_ends_at' => date('Y-m-d', strtotime('+7 days')),
]);
say('stock and promotion saved', $code === 200 && (int) ($priced['data']['stock'] ?? 0) === 9, 'stock=' . ($priced['data']['stock'] ?? '?') . ' compare=' . ($priced['data']['compare_at_price'] ?? '?'));

[$code, $orders] = call('GET', '/vendor/orders', $vendor);
$subId = $orders['data'][0]['id'] ?? null;
say('vendor sees the delivered order', $code === 200 && $subId, 'status=' . ($orders['data'][0]['status'] ?? '?'));

[$code, $shipped] = call('PUT', '/vendor/orders/' . $subId, $vendor, [
    'status' => 'shipped',
    'tracking_number' => 'ATL-TRACK-2002',
]);
say('order marked shipped', $code === 200 && ($shipped['data']['status'] ?? '') === 'shipped', 'tracking=' . ($shipped['data']['tracking_number'] ?? '?'));

[$code, $delivered] = call('PUT', '/vendor/orders/' . $subId, $vendor, ['status' => 'delivered']);
say('order marked delivered again', $code === 200 && ($delivered['data']['status'] ?? '') === 'delivered');

[$code, $sponsored] = call('POST', '/vendor/sponsorships', $vendor, [
    'product_id' => $published['id'],
    'budget' => 1500,
    'daily_amount' => 500,
]);
$spent = (float) ($sponsored['data']['spent'] ?? -1);
say('sponsorship charges the statement', $code === 201 && $spent >= 500, 'spent=' . $spent . ' status=' . ($sponsored['data']['status'] ?? '?'));

[$code, $afterSponsor] = call('GET', '/vendor/statements', $vendor);
$pendingAfter = (float) ($afterSponsor['data']['pending'] ?? -1);
say('pending fell by the daily fee', $code === 200 && abs(($pendingBefore - $pendingAfter) - 500) < 0.01, 'before=' . $pendingBefore . ' after=' . $pendingAfter);

$admin = login('admin@atelier.ng');
[$code, $closed] = call('POST', '/admin/statements/close', $admin);
say('week close', $code === 200, json_encode($closed['data'] ?? $closed['message'] ?? $closed));

[$code, $final] = call('GET', '/vendor/statements', $vendor);
$history = $final['data']['statements'][0] ?? null;
say('pending cleared onto a statement', $code === 200 && (float) ($final['data']['pending'] ?? -1) === 0.0 && $history, 'net=' . ($history['net'] ?? '?') . ' fees=' . ($history['sponsored_fees'] ?? '?'));

exit($failed ? 1 : 0);
