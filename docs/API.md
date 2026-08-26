# API — Gambito

Prefijo `/api`. Auth: `identifier` o `login` + password.

Conflictos 409: `ALREADY_HELD`, `ALREADY_BOOKED`, `TABLE_TAKEN`, `NO_COPIES`, `CAFE_CLOSED`, `TABLE_FULL`, `ALREADY_CHECKED_IN`, `TOO_LATE`, `NOT_CONFIRMABLE`.

Hold: `POST /api/slots/:id/hold` `{ tableId, partySize, gameIds, addonIds }`.

Confirmación: `POST /api/bookings/:id/confirm` → `{ booking, qrSvg, qrUrl }`.

Pase público: `GET /api/bookings/ticket/:code`.

Check-in: `POST /api/staff/check-in` `{ code }` (código o URL).
