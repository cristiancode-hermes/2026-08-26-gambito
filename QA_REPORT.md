# QA Report — 2026-08-26 Gambito

**Project:** Café de juegos B2C — mesas, copias físicas reales y pase QR
**Stack:** Angular 22 (zoneless) + NestJS 11 + TypeORM + SQLite
**Author:** Hermes Daily Builder / QA 07:00
**Slug:** `gambito` · Puerto **3075** · `https://gambito.proyectos.cristiancode.dev`

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc --incremental false` | ✅ | Jest + dist/main.js ya presentes; API live |
| Web `ng build` | ✅ | `apps/web/dist/web/browser/index.html` · baseHref `/` · rebuild 05:09 UTC (TZ staff Madrid) |
| isFinalDesign | DESIGN_FREE | Proyecto nuevo |

## ✅ 2. Test Results

**18/18 Jest** — ALL PASSED (9.5 s)

Suites: hold CAFE_CLOSED, expiresAt servidor, same-user 409, TABLE_TAKEN, NO_COPIES, TABLE_FULL, QR real `/partida/:code`, ALREADY_BOOKED, ticket público, check-in + 409 ALREADY_CHECKED_IN, now-playing/reorder, sweeper, 00:00 última, puntos 10×partySize, lista↔detalle, freeSlotsToday, login username/email.

## ✅ 3. Endpoint smoke (live :3075)

**21/21 PASS**

Login demo 201 · register 201 · me 200 · hold pending+expiresAt · same-user 409 · confirm QR SVG+URL `https://gambito.proyectos.cristiancode.dev/partida/GAMB-7F8T` · ticket público 200 · lista↔detalle 1800=1800 · staff check-in 201 · segundo 409 · slots 12:00→00:00 · puntos demo 40.

**QR real:** sí \| url: `/partida/:code`

## ✅ 4. Browser (Puppeteer, live Caddy)

**13/13 PASS**

Home plano 6 mesas · login split vacío + demo · login form · `/mesas/:id` Tapete Verde · `/juegos/:id` 7 Wonders · `/mis-partidas/:id` · `/partida/:code` QR SVG · dark CTA 5.66:1 · light CTA 9.04:1 · 390px overflow 0 · 0 console errors.

## ✅ 5. Quality / a11y

| Criterion | Verdict |
|-----------|---------|
| contraste-hover (2026-08-19) | **PASS** — `a:hover:not(.btn)` + on-primary en hover/focus/active. Pares light+dark ≥4.5:1 (primary 9.04/12.03, dark 5.66/8.05, accent 6.57/5.32) |
| Auth username OR email | PASS |
| Demo creds debajo, inputs vacíos | PASS |
| Auth routes antes del `**` | PASS (`/login` `/entrar` `/registro`) |
| TOKEN_KEY | `gambito.accessToken` (añadido a prod-capture ×2) |
| Capa de valor | Stock de copias + CafeDay + mutex mesa (no CRUD vacío) |
| Ciclo B2C | expiresAt servidor, sweeper, 409 same-user, QR real, check-in |
| Gráficos | N/A — tablero de mesas + now-playing (no chart vacío) |
| TZ Madrid | Fix QA: staff `setDay` usa `Europe/Madrid` (no UTC ISO) |

### Minor
- Staff stats son KPIs de texto (cubiertos/copias/revenue), no SVG chart. Aceptable para el dominio.
- TOKEN namespaced — capture config parcheado.

## ✅ 6. Security Scan

| Check | Result |
|-------|--------|
| Interceptor `***` | ausente (concat `'Bearer ' + token`) |
| APP_GUARD global | no |
| Hardcoded localhost API | no (`API='/api'`) |
| JWT | Passport, secret env |

## ✅ 7. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | ✅ | `gambito.proyectos.cristiancode.dev` → dist + reverse_proxy :3075 · live 200 |
| manage-apis.sh | ✅ | 60/60/60 alineado · gambito idx 59 · 3075 |
| GitHub | ✅ | `cristiancode-hermes/2026-08-26-gambito` |
| Landing | ✅ | CATEGORIES + gambito |
| Portfolio es/en/pt | ✅ | slug `gambito` id 227 date 2026-08-26 |
| Excel | ✅ | fila #91 |
| Capture config | ✅ | config.mjs + prod-capture slug map + `gambito.accessToken` |

## Summary

**OVERALL: PASS ✅**

Published: ✅ Caddy (gambito.proyectos.cristiancode.dev :3075), ✅ Portfolio (es.ts+en.ts+pt.ts), ✅ GitHub, ✅ Landing, ✅ Excel
