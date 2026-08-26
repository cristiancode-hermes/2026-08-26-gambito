import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Booking, eur } from '../shared/models';

@Component({
  selector: 'app-staff',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <h1>Sala</h1>
      <form (ngSubmit)="scan()">
        <label for="code">Código o URL del pase</label>
        <input id="code" name="code" autocomplete="off" [ngModel]="code()" (ngModelChange)="code.set($event)" />
        <button class="btn btn-primary" type="submit">Check-in</button>
      </form>
      @if (msg()) { <p>{{ msg() }}</p> }
      @if (last(); as b) {
        <p>{{ b.code }} → {{ b.status }} · {{ eur(b.totalCents) }}</p>
      }
      <h2>Día de sala</h2>
      <button class="btn btn-secondary" type="button" (click)="setDay('open')">Abrir</button>
      <button class="btn btn-secondary" type="button" (click)="setDay('limited')">Limitar</button>
      <button class="btn btn-secondary" type="button" (click)="setDay('closed')">Cerrar</button>
      @if (stats()) {
        <p>Cubiertos {{ stats()!.covers }} · copias {{ stats()!.copiesOut }} · {{ eur(stats()!.revenue) }}</p>
      }
    </div>
  `,
})
export class StaffPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly code = signal('');
  readonly msg = signal('');
  readonly last = signal<Booking | null>(null);
  readonly stats = signal<{ covers: number; copiesOut: number; revenue: number } | null>(null);
  readonly eur = eur;

  ngOnInit() {
    this.api.stats().subscribe({ next: (s) => this.stats.set(s) });
  }

  scan() {
    this.msg.set('');
    this.api.checkIn(this.code()).subscribe({
      next: (b) => {
        this.last.set(b);
        this.msg.set('Check-in hecho');
      },
      error: (err) => this.msg.set(err?.error?.message || 'Falló el scan'),
    });
  }

  setDay(status: string) {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
    this.api.patchDay(d, { status }).subscribe({ next: () => this.msg.set('Día actualizado a ' + status) });
  }
}
