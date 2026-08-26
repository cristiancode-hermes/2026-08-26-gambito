import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../core/api.service';
import { Booking, eur } from '../shared/models';

@Component({
  selector: 'app-partida',
  imports: [RouterLink],
  template: `
    <div class="wrap" style="padding:32px 16px">
      @if (error()) {
        <h1>Pase no encontrado</h1>
        <a routerLink="/">Volver</a>
      } @else if (!b()) {
        <p class="muted">Abriendo pase…</p>
      } @else {
        <h1>Pase {{ b()!.code }}</h1>
        <p>{{ b()!.status }} · {{ b()!.table?.name || b()!.cafeTable?.name }}</p>
        @if (qr()) { <div class="qr" [innerHTML]="qr()"></div> }
        <p><strong>{{ eur(b()!.totalCents) }}</strong></p>
      }
    </div>
  `,
})
export class PartidaPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly b = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly error = signal(false);
  readonly eur = eur;

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code')!;
    this.api.ticket(code).subscribe({
      next: (res) => {
        this.b.set(res.booking);
        this.qr.set(this.sanitizer.bypassSecurityTrustHtml(res.qrSvg));
      },
      error: () => this.error.set(true),
    });
  }
}
