import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'partida/:code',
    loadComponent: () => import('./pages/partida.page').then((m) => m.PartidaPageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent) },
      { path: 'mesas', loadComponent: () => import('./pages/tables.page').then((m) => m.TablesPageComponent) },
      { path: 'mesas/:id', loadComponent: () => import('./pages/table-detail.page').then((m) => m.TableDetailPageComponent) },
      { path: 'juegos', loadComponent: () => import('./pages/games.page').then((m) => m.GamesPageComponent) },
      { path: 'juegos/:id', loadComponent: () => import('./pages/game-detail.page').then((m) => m.GameDetailPageComponent) },
      {
        path: 'reservar',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPageComponent),
      },
      {
        path: 'confirmacion/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/confirmation.page').then((m) => m.ConfirmationPageComponent),
      },
      {
        path: 'mis-partidas',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/my-games.page').then((m) => m.MyGamesPageComponent),
      },
      {
        path: 'mis-partidas/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/session.page').then((m) => m.SessionPageComponent),
      },
      {
        path: 'staff',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPageComponent),
      },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPageComponent) },
    ],
  },
];
