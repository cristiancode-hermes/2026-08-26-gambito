# Architecture — Gambito

Monorepo `apps/web` (Angular 22 zoneless) + `apps/api` (NestJS 11).

Capa de valor: **stock de copias** por franja + mesa exclusiva + cola viva post check-in.

Hold 15 min (`expiresAt` servidor) + sweeper 30 s. Mutex in-process para better-sqlite3.

JWT namespaced `gambito.accessToken`. Interceptor lee localStorage, nunca AuthService.

QR real (`qrcode`) payload = `WEB_ORIGIN/partida/:code`.
