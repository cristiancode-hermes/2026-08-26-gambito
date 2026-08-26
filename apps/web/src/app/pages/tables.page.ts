import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CafeTable, eur } from '../shared/models';

@Component({
  selector: 'app-tables',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Mesas</h1>
      <p class="lede">Mismos huecos que en el plano de hoy. Libre / Ocupada según franjas libres.</p>
      @if (loading()) { <p class="muted">Cargando…</p> }
      @else if (!tables().length) { <p>No hay mesas.</p> }
      @else {
        <div class="cards">
          @for (t of tables(); track t.id) {
            <a class="card" [routerLink]="['/mesas', t.id]">
              <img [src]="t.photoUrl" [alt]="'Mesa ' + t.name" />
              <div class="card-body">
                <h3>{{ t.name }}</h3>
                <p class="muted">{{ t.seats }} asientos · {{ eur(t.priceCents) }} / franja</p>
                <span class="badge" [class.badge-free]="t.freeSlotsToday > 0" [class.badge-busy]="t.freeSlotsToday === 0">
                  {{ t.occupancyLabel }} · {{ t.freeSlotsToday }} huecos hoy
                </span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class TablesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly tables = signal<CafeTable[]>([]);
  readonly loading = signal(true);
  readonly eur = eur;

  ngOnInit() {
    this.api.tables().subscribe({
      next: (t) => { this.tables.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
