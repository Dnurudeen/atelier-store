<?php

namespace Tests\Unit;

use App\Http\Middleware\AuthenticateApiToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class AuthenticateApiTokenTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_rejects_missing_and_invalid_tokens(): void
    {
        $middleware = new AuthenticateApiToken;

        $missing = $middleware->handle(Request::create('/api/v1/auth/me', 'GET'), fn () => response('ok'));
        $this->assertSame(401, $missing->getStatusCode());

        $request = Request::create('/api/v1/auth/me', 'GET');
        $request->headers->set('Authorization', 'Bearer invalid-token');
        $invalid = $middleware->handle($request, fn () => response('ok'));
        $this->assertSame(401, $invalid->getStatusCode());
    }

    public function test_sets_user_resolver_for_valid_token(): void
    {
        $user = $this->makeUser();
        $middleware = new AuthenticateApiToken;

        $request = Request::create('/api/v1/auth/me', 'GET');
        $request->headers->set('Authorization', 'Bearer '.$user->api_token);

        $response = $middleware->handle($request, function (Request $req) use ($user) {
            $this->assertSame($user->id, $req->user()->id);

            return response('ok');
        });

        $this->assertSame(200, $response->getStatusCode());
    }
}
