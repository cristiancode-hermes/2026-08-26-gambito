import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Página no encontrada</h1>
      <p><a routerLink="/">Volver a la sala</a></p>
    </div>
  `,
})
export class NotFoundPageComponent {}
