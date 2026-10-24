# syntax=docker/dockerfile:1

# Multi-stage build: only the last stage ships. Composer, Node and
# node_modules stay in the build stages, which keeps the final image small.

# ---- 1. PHP dependencies (production only) ----
FROM serversideup/php:8.5.12-cli-alpine AS vendor
USER root
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress --no-scripts --no-autoloader
COPY . .
# Runs pre-autoload-dump, which strips every AWS SDK service except S3 (see composer.json "extra")
RUN composer dump-autoload --optimize --no-dev

# ---- 2. Frontend assets (Vite). The Wayfinder plugin runs artisan, so this stage needs PHP too ----
FROM serversideup/php:8.5.12-cli-alpine AS assets
USER root
RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
COPY --from=vendor /app/vendor ./vendor
RUN npm run build

# ---- 3. Runtime: Nginx + PHP-FPM on Alpine, listens on 8080 ----
FROM serversideup/php:8.5.12-fpm-nginx-alpine AS runtime

ENV PHP_OPCACHE_ENABLE=1 \
    AUTORUN_ENABLED=true \
    AUTORUN_LARAVEL_MIGRATION=false

WORKDIR /var/www/html

# Copy only what the app needs at runtime (no resources/js, resources/css, tests, node files)
COPY --chown=www-data:www-data artisan composer.json ./
COPY --chown=www-data:www-data app ./app
COPY --chown=www-data:www-data bootstrap ./bootstrap
COPY --chown=www-data:www-data config ./config
COPY --chown=www-data:www-data database ./database
COPY --chown=www-data:www-data public ./public
COPY --chown=www-data:www-data resources/views ./resources/views
COPY --chown=www-data:www-data routes ./routes
COPY --chown=www-data:www-data storage ./storage
COPY --chown=www-data:www-data --from=vendor /app/vendor ./vendor
COPY --chown=www-data:www-data --from=assets /app/public/build ./public/build

RUN php artisan package:discover --ansi

EXPOSE 8080
