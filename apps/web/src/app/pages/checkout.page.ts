import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Addon, CafeTable, Game, Slot, eur } from '../shared/models';
import { humanizeApiError, scrollToHoldAction } from '../shared/humanize-error';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap">
      @if (loadError()) {
        <section class="state-screen" role="alert">
          <h1>No se pudo cargar la reserva</h1>
          <p class="lede">Revisa la conexión e inténtalo de nuevo.</p>
          <button class="btn btn-primary" type="button" (click)="reload()">Reintentar</button>
        </section>
      } @else if (loading()) {
        <section class="state-screen">
          <h1>Reservar</h1>
          <p class="muted">Cargando mesas y franjas…</p>
        </section>
      } @else if (!tables().length || !slots().length) {
        <section class="state-screen">
          <h1>Hoy no hay mesas libres</h1>
          <p class="lede">Vuelve más tarde o mira el plano de la sala.</p>
          <a class="btn btn-primary" routerLink="/">Ver sala</a>
        </section>
      } @else {
        <h1>Reservar</h1>
        <p class="lede">Mesa, franja y mochila. El total se calcula antes de retener.</p>
        <h2>Mesa</h2>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
          @for (t of tables(); track t.id) {
            <button type="button" class="slot-chip" [class.selected]="tableId() === t.id" (click)="tableId.set(t.id)">
              <span class="slot-time">{{ t.name }}</span>
              <span class="slot-state">{{ t.seats }} plazas · {{ eur(t.priceCents) }}</span>
            </button>
          }
        </div>
        <h2>Franja</h2>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
          @for (s of slots(); track s.id) {
            <button type="button" class="slot-chip" [class.selected]="slotId() === s.id" (click)="pickSlot(s.id)">
              <span class="slot-time">{{ s.startTime }}</span>
              <span class="slot-state">{{ s.endTime }}</span>
            </button>
          }
        </div>
        <label>Tamaño del grupo
          <input type="number" min="1" [ngModel]="party()" (ngModelChange)="party.set(+$event)" />
        </label>
        <h2>Mochila</h2>
        <div class="picker">
          @for (g of games(); track g.id) {
            <label [class.disabled]="g.availableCopies < 1">
              <input type="checkbox" [disabled]="g.availableCopies < 1"
                [ngModel]="selectedGames().includes(g.id)"
                (ngModelChange)="toggleGame(g.id, $event)" />
              <span>
                <strong>{{ g.title }}</strong>
                <span class="muted"> · {{ g.availableCopies }} copias</span>
              </span>
            </label>
          }
        </div>
        <h2>Extras</h2>
        <div class="picker">
          @for (a of addons(); track a.id) {
            <label>
              <input type="checkbox" [ngModel]="selectedAddons().includes(a.id)" (ngModelChange)="toggleAddon(a.id, $event)" />
              <span>{{ a.name }} · {{ eur(a.priceCents) }}</span>
            </label>
          }
        </div>
        <aside class="summary" id="hold-action">
          <h3>Resumen</h3>
          <ul>
            @for (l of quote().lines; track l.label) {
              <li><span>{{ l.label }}</span><span>{{ eur(l.lineCents) }}</span></li>
            }
          </ul>
          <p><strong>Total {{ eur(quote().totalCents) }}</strong></p>
          <button class="btn btn-primary" type="button" (click)="hold()" [disabled]="busy()">
            {{ busy() ? 'Reteniendo…' : 'Retener 15 min' }}
          </button>
          @if (error()) {
            <p class="form-error hold-error" role="alert">{{ error() }}</p>
          }
        </aside>
      }
    </div>
  `,
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly tables = signal<CafeTable[]>([]);
  readonly slots = signal<Slot[]>([]);
  readonly games = signal<Game[]>([]);
  readonly addons = signal<Addon[]>([]);
  readonly tableId = signal('');
  readonly slotId = signal('');
  readonly party = signal(2);
  readonly selectedGames = signal<string[]>([]);
  readonly selectedAddons = signal<string[]>([]);
  readonly error = signal('');
  readonly loadError = signal(false);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly eur = eur;

  readonly quote = computed(() => {
    const t = this.tables().find((x) => x.id === this.tableId());
    const gs = this.games().filter((g) => this.selectedGames().includes(g.id));
    const as = this.addons().filter((a) => this.selectedAddons().includes(a.id));
    const lines: Array<{ label: string; lineCents: number }> = [];
    if (t) lines.push({ label: `Mesa ${t.name}`, lineCents: t.priceCents });
    for (const g of gs) lines.push({ label: g.title, lineCents: g.copySurchargeCents });
    for (const a of as) lines.push({ label: a.name, lineCents: a.priceCents });
    return { lines, totalCents: lines.reduce((s, l) => s + l.lineCents, 0) };
  });

  ngOnInit() {
    this.reload();
  }

  ngOnDestroy() {}

  reload() {
    const preset = this.route.snapshot.queryParamMap.get('tableId') || '';
    this.loading.set(true);
    this.loadError.set(false);
    this.error.set('');
    forkJoin({
      tables: this.api.tables(),
      slots: this.api.slots(),
      games: this.api.games(),
      addons: this.api.addons(),
    }).subscribe({
      next: (res) => {
        this.tables.set(res.tables);
        this.slots.set(res.slots);
        this.games.set(res.games);
        this.addons.set(res.addons);
        this.tableId.set(preset || res.tables[0]?.id || '');
        this.slotId.set(res.slots[0]?.id || '');
        if (this.slotId()) this.reloadGames();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  pickSlot(id: string) {
    this.slotId.set(id);
    this.reloadGames();
  }

  reloadGames() {
    this.api.games({ slotId: this.slotId() }).subscribe((g) => this.games.set(g));
  }

  toggleGame(id: string, on: boolean) {
    const cur = this.selectedGames();
    this.selectedGames.set(on ? [...cur, id] : cur.filter((x) => x !== id));
  }

  toggleAddon(id: string, on: boolean) {
    const cur = this.selectedAddons();
    this.selectedAddons.set(on ? [...cur, id] : cur.filter((x) => x !== id));
  }

  hold() {
    this.error.set('');
    if (!this.tableId() || !this.slotId()) {
      this.error.set('Elige mesa y franja');
      scrollToHoldAction();
      return;
    }
    this.busy.set(true);
    this.api
      .hold(this.slotId(), {
        tableId: this.tableId(),
        partySize: this.party(),
        gameIds: this.selectedGames(),
        addonIds: this.selectedAddons(),
      })
      .subscribe({
        next: (b) => {
          this.busy.set(false);
          void this.router.navigate(['/confirmacion', b.id]);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(humanizeApiError(err, 'No se pudo retener. Prueba otra mesa o franja.'));
          scrollToHoldAction();
        },
      });
  }
}
