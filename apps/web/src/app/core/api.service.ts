import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API, Addon, Booking, CafeTable, Game, Slot } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  tables() {
    return this.http.get<CafeTable[]>(`${API}/tables`);
  }
  table(id: string) {
    return this.http.get<CafeTable>(`${API}/tables/${id}`);
  }
  games(params?: { players?: number; maxMinutes?: number; q?: string; slotId?: string }) {
    return this.http.get<Game[]>(`${API}/games`, { params: params as any });
  }
  game(id: string, slotId?: string) {
    return this.http.get<Game>(`${API}/games/${id}`, { params: slotId ? { slotId } : {} });
  }
  slots(date?: string) {
    return this.http.get<Slot[]>(`${API}/slots`, { params: date ? { date } : {} });
  }
  addons() {
    return this.http.get<Addon[]>(`${API}/addons`);
  }
  cafeToday() {
    return this.http.get<{ status: string; note: string | null; day: string }>(`${API}/cafe-days/today`);
  }
  nowPlaying() {
    return this.http.get<Array<{ tableName: string; game: Game }>>(`${API}/now-playing`);
  }
  hold(slotId: string, body: { tableId: string; partySize: number; gameIds: string[]; addonIds?: string[] }) {
    return this.http.post<Booking>(`${API}/slots/${slotId}/hold`, body);
  }
  bookings() {
    return this.http.get<Booking[]>(`${API}/bookings`);
  }
  booking(id: string) {
    return this.http.get<Booking>(`${API}/bookings/${id}`);
  }
  confirm(id: string) {
    return this.http.post<{ booking: Booking; qrSvg: string; qrUrl: string }>(`${API}/bookings/${id}/confirm`, {});
  }
  cancel(id: string) {
    return this.http.post<Booking>(`${API}/bookings/${id}/cancel`, {});
  }
  ticket(code: string) {
    return this.http.get<{ booking: Booking; qrSvg: string; qrUrl: string }>(`${API}/bookings/ticket/${code}`);
  }
  queue(id: string, body: { order: string[]; nowPlayingGameId?: string }) {
    return this.http.patch(`${API}/bookings/${id}/queue`, body);
  }
  checkIn(code: string) {
    return this.http.post<Booking>(`${API}/staff/check-in`, { code });
  }
  patchDay(date: string, body: { status: string; note?: string }) {
    return this.http.patch(`${API}/staff/cafe-days/${date}`, body);
  }
  stats() {
    return this.http.get<{ covers: number; copiesOut: number; revenue: number }>(`${API}/stats/today`);
  }
  points() {
    return this.http.get<{ points: number }>(`${API}/me/points`);
  }
}
