import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CafeTable, Game } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Sala de hoy</h1>
      <p class="lede">Elige mesa libre, mira qué se está jugando y reserva franja. Las copias se cuentan, no se inventan.</p>
      @if (day()) {
        <p class="muted">{{ day()!.day }} · {{ day()!.status }} @if (day()!.note) { — {{ day()!.note }} }</p>
      }
      <h2>Plano de mesas</h2>
      @if (loading()) {
        <p class="muted">Cargando mesas…</p>
      } @else if (!tables().length) {
        <p>No hay mesas. Vuelve más tarde.</p>
      } @else {
        <div class="floor">
          @for (t of tables(); track t.id) {
            <a class="floor-cell" [class.free]="t.freeSlotsToday > 0" [routerLink]="['/mesas', t.id]">
              <strong>{{ t.name }}</strong>
              <span>{{ t.seats }} asientos</span>
              <span class="badge" [class.badge-free]="t.freeSlotsToday > 0" [class.badge-busy]="t.freeSlotsToday === 0">
                {{ t.occupancyLabel }} · {{ t.freeSlotsToday }} huecos hoy
              </span>
            </a>
          }
        </div>
      }
      <h2>Now playing</h2>
      <div class="rail">
        @for (n of playing(); track $index) {
          <div class="rail-item">
            <div class="now">En mesa</div>
            <strong>{{ n.game.title }}</strong>
            <p class="muted">{{ n.tableName }}</p>
          </div>
        } @empty {
          <p class="muted">Nadie ha hecho check-in todavía.</p>
        }
      </div>
      <p><a class="btn btn-primary" routerLink="/reservar">Reservar mesa</a></p>
    </div>
  `,
})
export class HomePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly tables = signal<CafeTable[]>([]);
  readonly playing = signal<Array<{ tableName: string; game: Game }>>([]);
  readonly day = signal<{ status: string; note: string | null; day: string } | null>(null);
  readonly loading = signal(true);

  ngOnInit() {
    this.api.tables().subscribe({
      next: (t) => { this.tables.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.nowPlaying().subscribe({ next: (r) => this.playing.set(r) });
    this.api.cafeToday().subscribe({ next: (d) => this.day.set(d) });
  }
}
