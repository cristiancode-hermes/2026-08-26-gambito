const HOLD_ERRORS: Record<string, string> = {
  TABLE_TAKEN: 'Otro grupo ya tiene esta mesa. Elige otra mesa o franja.',
  ALREADY_HELD: 'Ya tienes una retención viva en esta mesa y franja.',
  ALREADY_BOOKED: 'Ya tienes esta mesa confirmada.',
  NO_COPIES: 'No quedan copias de ese juego en esta franja.',
  CAFE_CLOSED: 'El café está cerrado ese día.',
  TABLE_FULL: 'El grupo no cabe en esta mesa.',
  NOT_CONFIRMABLE: 'Esta reserva ya no se puede confirmar.',
  TOO_LATE: 'Solo se puede cancelar hasta 24 h antes.',
  ALREADY_CHECKED_IN: 'Este pase ya se usó.',
};

function extractCode(err: unknown): string {
  const body = (err as { error?: unknown } | undefined)?.error;
  if (body && typeof body === 'object') {
    const rec = body as { code?: unknown; message?: unknown };
    if (typeof rec.code === 'string') return rec.code;
    if (typeof rec.message === 'string') {
      const m = rec.message.match(/^([A-Z][A-Z0-9_]+)\s*:/);
      if (m) return m[1];
    }
  }
  if (typeof body === 'string') {
    const m = body.match(/^([A-Z][A-Z0-9_]+)\s*:/);
    if (m) return m[1];
  }
  return '';
}

function stripCodePrefix(raw: string): string {
  return raw.replace(/^[A-Z][A-Z0-9_]+:\s*/, '').trim();
}

/** Map Nest 409 `{ code, message: "CODE: …" }` to copy without the API code. */
export function humanizeApiError(err: unknown, fallback: string): string {
  const code = extractCode(err);
  if (code && HOLD_ERRORS[code]) return HOLD_ERRORS[code];
  const body = (err as { error?: unknown } | undefined)?.error;
  const raw =
    body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : typeof body === 'string'
        ? body
        : '';
  const stripped = stripCodePrefix(raw);
  if (stripped && !/^[A-Z][A-Z0-9_]+$/.test(stripped)) return stripped;
  return fallback;
}

export function scrollToHoldAction(): void {
  const go = () =>
    document.getElementById('hold-action')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  queueMicrotask(() => requestAnimationFrame(go));
}
