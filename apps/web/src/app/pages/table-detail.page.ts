import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CafeTable, eur } from '../shared/models';

@Component({
  selector: 'app-table-detail',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <h1>Mesa no encontrada</h1>
        <a routerLink="/mesas">Volver al listado</a>
      } @else if (!table()) {
        <p class="muted">Cargando mesa…</p>
      } @else {
        <img [src]="table()!.photoUrl" [alt]="table()!.name" style="width:100%;max-height:280px;object-fit:cover;border-radius:16px" />
        <h1>{{ table()!.name }}</h1>
        <p class="lede">{{ table()!.blurb }}</p>
        <p>{{ table()!.seats }} asientos · {{ eur(table()!.priceCents) }} · {{ table()!.occupancyLabel }} · {{ table()!.freeSlotsToday }} huecos hoy</p>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
          @for (s of table()!.occupancy || []; track s.slotId) {
            <button class="slot-chip" [class.busy]="s.taken" type="button" disabled>
              <span class="slot-time">{{ s.startTime }}</span>
              <span class="slot-state">{{ s.status }}</span>
            </button>
          }
        </div>
        <p><a class="btn btn-primary" [routerLink]="['/reservar']" [queryParams]="{ tableId: table()!.id }">Reservar esta mesa</a></p>
      }
    </div>
  `,
})
export class TableDetailPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly table = signal<CafeTable | null>(null);
  readonly error = signal(false);
  readonly eur = eur;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.table(id).subscribe({
      next: (t) => this.table.set(t),
      error: () => this.error.set(true),
    });
  }
}
