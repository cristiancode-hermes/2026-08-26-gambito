import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Game } from '../shared/models';

@Component({
  selector: 'app-game-detail',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <h1>Juego no encontrado</h1>
        <a routerLink="/juegos">Volver al catálogo</a>
      } @else if (!game()) {
        <p class="muted">Cargando ficha…</p>
      } @else {
        <img [src]="game()!.photoUrl" [alt]="game()!.title" style="width:100%;max-height:280px;object-fit:cover;border-radius:16px" />
        <h1>{{ game()!.title }}</h1>
        <p>{{ game()!.minPlayers }}–{{ game()!.maxPlayers }} jugadores · {{ game()!.minutes }} min · peso {{ game()!.weight }}</p>
        <p class="badge" [class.badge-free]="game()!.availableCopies > 0">{{ game()!.availableCopies }} / {{ game()!.totalCopies }} copias</p>
        <p><a class="btn btn-primary" routerLink="/reservar">Llevar a una mesa</a></p>
      }
    </div>
  `,
})
export class GameDetailPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly game = signal<Game | null>(null);
  readonly error = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.game(id).subscribe({
      next: (g) => this.game.set(g),
      error: () => this.error.set(true),
    });
  }
}
