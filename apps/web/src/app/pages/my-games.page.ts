import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Booking, eur } from '../shared/models';

@Component({
  selector: 'app-my-games',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Mis partidas</h1>
      @if (loading()) { <p class="muted">Cargando…</p> }
      @else if (!rows().length) {
        <p>Aún no hay reservas. <a routerLink="/reservar">Reservar mesa</a></p>
      } @else {
        <div class="cards">
          @for (b of rows(); track b.id) {
            <a class="card" [routerLink]="['/mis-partidas', b.id]">
              <div class="card-body">
                <h3>{{ b.code }}</h3>
                <p>{{ b.status }} · {{ b.slot?.startTime }} · {{ eur(b.totalCents) }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class MyGamesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly rows = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly eur = eur;

  ngOnInit() {
    this.api.bookings().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
