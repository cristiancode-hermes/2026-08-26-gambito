import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Booking, eur } from '../shared/models';
import { humanizeApiError, scrollToHoldAction } from '../shared/humanize-error';

@Component({
  selector: 'app-session',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen" role="alert">
          <h1>Partida no encontrada</h1>
          <p class="lede">Ese enlace no corresponde a una reserva tuya.</p>
          <a class="btn btn-primary" routerLink="/mis-partidas">Volver a mis partidas</a>
        </section>
      } @else if (!b()) {
        <section class="state-screen">
          <h1>Partida</h1>
          <p class="muted">Cargando partida…</p>
        </section>
      } @else {
        <h1>{{ b()!.code }}</h1>
        <p>{{ b()!.status }} · {{ b()!.table?.name || b()!.cafeTable?.name }} · {{ b()!.slot?.startTime }}</p>
        @if (qr()) { <div class="qr" [innerHTML]="qr()"></div> }
        @if (b()!.qrUrl) { <p><a [href]="b()!.qrUrl">{{ b()!.qrUrl }}</a></p> }
        <ul>
          @for (l of b()!.lines; track l.id) {
            <li>{{ l.label }} — {{ eur(l.lineCents) }}</li>
          }
        </ul>
        <p><strong>Total {{ eur(b()!.totalCents) }}</strong></p>
        @if (b()!.status === 'checked_in') {
          <h2>Cola viva</h2>
          @for (q of b()!.queue; track q.id) {
            <label>
              <input type="radio" name="np" [checked]="q.isNowPlaying" (change)="nowPlaying(q.gameId)" />
              {{ q.game?.title || q.gameId }}
            </label>
          }
        }
        @if (b()!.status === 'confirmed' || b()!.status === 'pending') {
          <div id="hold-action">
            <button class="btn btn-secondary" type="button" (click)="cancel()">Cancelar</button>
            @if (actionError()) { <p class="form-error hold-error" role="alert">{{ actionError() }}</p> }
          </div>
        }
      }
    </div>
  `,
})
export class SessionPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly b = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly eur = eur;

  ngOnInit() {
    this.api.booking(this.route.snapshot.paramMap.get('id')!).subscribe({
      next: (b) => this.apply(b),
      error: () => this.error.set('Partida no encontrada'),
    });
  }

  private apply(b: Booking) {
    this.b.set(b);
    if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
  }

  nowPlaying(gameId: string) {
    const b = this.b();
    if (!b) return;
    this.api.queue(b.id, { order: b.queue.map((q) => q.gameId), nowPlayingGameId: gameId }).subscribe({
      next: () => this.api.booking(b.id).subscribe((nb) => this.apply(nb)),
    });
  }

  cancel() {
    const b = this.b();
    if (!b) return;
    this.api.cancel(b.id).subscribe({
      next: (nb) => this.apply(nb),
      error: (err) => {
        this.actionError.set(humanizeApiError(err, 'No se pudo cancelar.'));
        scrollToHoldAction();
      },
    });
  }
}
