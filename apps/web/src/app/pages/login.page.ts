import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-split">
      <div class="auth-visual">
        <img src="/assets/login-cover.svg" alt="Tapete de café de juegos con meeples y dados" />
        <div class="auth-visual-overlay">
          <h1>Gambito</h1>
          <p>Mesa, caja real, pase en el bolsillo.</p>
        </div>
      </div>
      <div class="auth-form-side">
        <h2>Entrar</h2>
        <p class="lede">Usuario o email. Sin caja, sin relleno.</p>
        <form (ngSubmit)="submit()">
          <label for="identifier">Usuario o email</label>
          <input id="identifier" name="identifier" type="text" autocomplete="off"
            [ngModel]="identifier()" (ngModelChange)="identifier.set($event)" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="new-password"
            [ngModel]="password()" (ngModelChange)="password.set($event)" />
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">
            {{ auth.loading() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
        <p class="auth-alt">¿Primera visita? <a routerLink="/registro">Crea cuenta</a></p>
        <div class="auth-demo">
          <p>Cuenta de prueba con datos</p>
          <code>gambito</code> o <code>demo@gambito.dev</code>
          <code>demo1234</code>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly identifier = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit() {
    this.error.set('');
    if (!this.identifier() || !this.password()) {
      this.error.set('Escribe usuario y contraseña');
      return;
    }
    this.auth.login({ identifier: this.identifier(), password: this.password() }).subscribe({
      next: () => {
        const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(ret);
      },
      error: (err) => this.error.set(err?.error?.message || 'Credenciales inválidas'),
    });
  }
}
