<?php

declare(strict_types=1);

/**
 * Prefer `php bin/phpunit` which also registers missing classmap packages.
 * This bootstrap keeps a standard PHPUnit XML entrypoint working when possible.
 */
require dirname(__DIR__) . '/vendor/autoload.php';
