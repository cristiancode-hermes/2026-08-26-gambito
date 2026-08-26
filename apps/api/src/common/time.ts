export const MADRID_TZ = 'Europe/Madrid';

export function madridNowParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: MADRID_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    hhmm: `${parts.hour}:${parts.minute}`,
  };
}

export function madridToday(now = new Date()): string {
  return madridNowParts(now).date;
}

export function addMadridDays(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + delta));
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function nightSlotSortKey(startTime: string): number {
  if (startTime === '00:00') return 24;
  const h = Number(startTime.slice(0, 2));
  return Number.isFinite(h) ? h : 99;
}

export function sortNightSlots<T extends { startTime: string; sortKey?: number }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => {
    const ka = a.sortKey ?? nightSlotSortKey(a.startTime);
    const kb = b.sortKey ?? nightSlotSortKey(b.startTime);
    return ka - kb;
  });
}

export function hoursUntilSlotStart(date: string, startTime: string, now = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = startTime.split(':').map(Number);
  const hour = startTime === '00:00' ? 24 : hh;
  const guess = new Date(Date.UTC(y, m - 1, d, hour === 24 ? 0 : hour, mm));
  if (hour === 24) guess.setUTCDate(guess.getUTCDate() + 1);
  for (let i = 0; i < 4; i++) {
    const p = madridNowParts(guess);
    const wantHour = hour === 24 ? 0 : hh;
    const want = `${String(wantHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const wantDate = hour === 24 ? addMadridDays(date, 1) : date;
    if (p.date === wantDate && p.hhmm === want) break;
    const deltaMin =
      (wantHour * 60 + mm) -
      (p.hour * 60 + p.minute) +
      (wantDate > p.date ? 24 * 60 : wantDate < p.date ? -24 * 60 : 0);
    guess.setUTCMinutes(guess.getUTCMinutes() + deltaMin);
  }
  return (guess.getTime() - now.getTime()) / 36e5;
}
