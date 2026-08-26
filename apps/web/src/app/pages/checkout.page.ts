import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Addon, CafeTable, Game, Slot, eur } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <h1>Reservar</h1>
      <p class="lede">Mesa, franja y mochila. El total se calcula antes de retener.</p>
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
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
      <aside class="summary">
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
      </aside>
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
    const preset = this.route.snapshot.queryParamMap.get('tableId') || '';
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
      },
      error: () => this.error.set('No se pudo cargar el checkout'),
    });
  }

  ngOnDestroy() {}

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
          this.error.set(err?.error?.message || err?.error?.code || 'No se pudo retener');
        },
      });
  }
}
