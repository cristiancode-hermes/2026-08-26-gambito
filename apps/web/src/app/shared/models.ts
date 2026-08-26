export const TOKEN_KEY = 'gambito.accessToken';
export const API = '/api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'visitor' | 'staff' | 'admin';
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface CafeTable {
  id: string;
  slug: string;
  name: string;
  seats: number;
  priceCents: number;
  photoUrl: string;
  blurb: string;
  freeSlotsToday: number;
  occupancyLabel: string;
  occupancy?: Occupancy[];
}

export interface Occupancy {
  slotId: string;
  startTime: string;
  endTime: string;
  sortKey: number;
  status: string;
  taken: boolean;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  minPlayers: number;
  maxPlayers: number;
  minutes: number;
  weight: number;
  totalCopies: number;
  availableCopies: number;
  mechanics: string[];
  photoUrl: string;
  copySurchargeCents: number;
}

export interface Slot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  sortKey: number;
}

export interface Addon {
  id: string;
  name: string;
  priceCents: number;
}

export interface BookingLine {
  id: string;
  kind: string;
  label: string;
  qty: number;
  unitCents: number;
  lineCents: number;
}

export interface QueueEntry {
  id: string;
  gameId: string;
  position: number;
  isNowPlaying: boolean;
  game?: Game;
}

export interface Booking {
  id: string;
  code: string;
  status: string;
  partySize: number;
  expiresAt: string | null;
  qrSvg: string | null;
  qrUrl: string | null;
  totalCents: number;
  lines: BookingLine[];
  queue: QueueEntry[];
  table?: CafeTable;
  cafeTable?: CafeTable;
  slot?: Slot;
  cafeTableId: string;
  slotId: string;
}

export function eur(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}
