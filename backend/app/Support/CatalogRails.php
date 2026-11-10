<?php

namespace App\Support;

class CatalogRails
{
    public static function uniqueImages(iterable $products, int $limit = 12): array
    {
        $seen = [];
        $picked = [];

        foreach ($products as $product) {
            $url = $product->images->first()->url ?? null;
            $key = $url ?: 'id:'.$product->id;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $picked[] = $product;
            if (count($picked) >= $limit) {
                break;
            }
        }

        return $picked;
    }
}
