@echo off
REM Atelier Nigeria backend bootstrap (Windows)
cd /d "%~dp0"

if not exist vendor\autoload.php (
  echo Installing Composer dependencies...
  composer install --prefer-dist --no-interaction
)

if not exist .env (
  copy .env.example .env
)

php artisan key:generate
if not exist database\database.sqlite (
  type nul > database\database.sqlite
)

php artisan migrate --force
php artisan db:seed --force
echo.
echo Backend ready. Run: php artisan serve
