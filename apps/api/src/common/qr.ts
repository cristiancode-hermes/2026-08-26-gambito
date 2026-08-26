import * as QRCode from 'qrcode';

export function webOrigin(): string {
  const raw =
    process.env.WEB_ORIGIN ||
    process.env.PUBLIC_WEB_ORIGIN ||
    'https://gambito.proyectos.cristiancode.dev';
  return raw.replace(/\/$/, '');
}

export function partidaUrl(code: string): string {
  return `${webOrigin()}/partida/${encodeURIComponent(String(code).trim())}`;
}

export function extractTicketCode(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    const last = u.pathname.split('/').filter(Boolean).pop() || '';
    if (last) return decodeURIComponent(last).toUpperCase();
  } catch {
    /* not a URL */
  }
  return s.toUpperCase();
}

export async function buildSessionQrSvg(url: string, code: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#1A4A3C', light: '#FFFFFF' },
  });
  return svg.replace(
    /^<svg\b/,
    `<svg role="img" aria-label="QR ${escapeXml(code)}" data-session-url="${escapeXml(url)}"`,
  );
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tail = '';
  for (let i = 0; i < 4; i++) tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `GAMB-${tail}`;
}
