<?php

namespace Tests\Unit;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_value_returns_stored_setting(): void
    {
        Setting::create(['key' => 'commission_rate', 'value' => '12.5']);

        $this->assertSame('12.5', Setting::getValue('commission_rate'));
    }

    public function test_get_value_returns_default_when_missing(): void
    {
        $this->assertSame(10, Setting::getValue('commission_rate', 10));
        $this->assertNull(Setting::getValue('missing_key'));
    }
}
