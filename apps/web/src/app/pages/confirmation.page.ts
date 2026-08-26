import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../core/api.service';
import { Booking, eur } from '../shared/models';

@Component({
  selector: 'app-confirmation',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Retención</h1>
      @if (!booking()) { <p class="muted">Cargando…</p> }
      @else {
        <p>Código <code>{{ booking()!.code }}</code> · {{ booking()!.status }}</p>
        @if (booking()!.status === 'pending' && remain()) {
          <p>Expira en {{ remain() }}</p>
          <button class="btn btn-primary" type="button" (click)="pay()">Confirmar y pagar</button>
        }
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
          <p><a [href]="booking()!.qrUrl" target="_blank" rel="noreferrer">{{ booking()!.qrUrl }}</a></p>
        }
        <ul>
          @for (l of booking()!.lines; track l.id) {
            <li>{{ l.label }} — {{ eur(l.lineCents) }}</li>
          }
        </ul>
        <p><strong>Total {{ eur(booking()!.totalCents) }}</strong></p>
        <p><a routerLink="/mis-partidas">Mis partidas</a></p>
        @if (error()) { <p class="form-error">{{ error() }}</p> }
      }
    </div>
  `,
})
export class ConfirmationPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  readonly booking = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly remain = signal('');
  readonly error = signal('');
  readonly eur = eur;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.booking(id).subscribe({
      next: (b) => this.apply(b),
      error: () => this.error.set('Reserva no encontrada'),
    });
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private apply(b: Booking) {
    this.booking.set(b);
    if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
    this.tick();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 1000);
  }

  private tick() {
    const b = this.booking();
    if (!b?.expiresAt) {
      this.remain.set('');
      return;
    }
    const ms = new Date(b.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      this.remain.set('00:00');
      return;
    }
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    this.remain.set(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  }

  pay() {
    const b = this.booking();
    if (!b) return;
    this.api.confirm(b.id).subscribe({
      next: (res) => {
        this.apply(res.booking);
        this.qr.set(this.sanitizer.bypassSecurityTrustHtml(res.qrSvg));
      },
      error: (err) => this.error.set(err?.error?.message || 'No se pudo confirmar'),
    });
  }
}
