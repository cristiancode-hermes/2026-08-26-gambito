import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Game } from '../shared/models';

@Component({
  selector: 'app-games',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="wrap">
      <h1>Cajas</h1>
      <p class="lede">Solo entra en la mochila si queda copia física para la franja.</p>
      <label>Jugadores
        <input type="number" [ngModel]="players()" (ngModelChange)="players.set($event); load()" />
      </label>
      @if (loading()) { <p class="muted">Cargando catálogo…</p> }
      @else if (!games().length) { <p>Ningún título encaja con el filtro.</p> }
      @else {
        <div class="cards">
          @for (g of games(); track g.id) {
            <a class="card" [routerLink]="['/juegos', g.id]">
              <img [src]="g.photoUrl" [alt]="'Caja de ' + g.title" />
              <div class="card-body">
                <h3>{{ g.title }}</h3>
                <p class="muted">{{ g.minPlayers }}–{{ g.maxPlayers }} · {{ g.minutes }} min</p>
                <span class="badge" [class.badge-free]="g.availableCopies > 0" [class.badge-busy]="g.availableCopies === 0">
                  {{ g.availableCopies }} copias libres
                </span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class GamesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly games = signal<Game[]>([]);
  readonly loading = signal(true);
  readonly players = signal<number | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const p = this.players();
    this.api.games(p ? { players: Number(p) } : {}).subscribe({
      next: (g) => { this.games.set(g); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
