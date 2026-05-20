import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'clients',
    canActivate: [authGuard],
    loadComponent: () => import('./features/clients/clients.page').then((m) => m.ClientsPage),
  },
  {
    path: 'professionals',
    canActivate: [authGuard],
    loadComponent: () => import('./features/professionals/professionals.page').then((m) => m.ProfessionalsPage),
  },
  {
    path: 'scheduling',
    canActivate: [authGuard],
    loadComponent: () => import('./features/scheduling/scheduling.page').then((m) => m.SchedulingPage),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
  },
  {
    path: 'finance',
    canActivate: [authGuard],
    loadComponent: () => import('./features/finance/finance.page').then((m) => m.FinancePage),
  },
  {
    path: 'services',
    canActivate: [authGuard],
    loadComponent: () => import('./features/services/services.page').then((m) => m.ServicesPage),
  },
  {
    path: 'my-schedule',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/client-booking/client-booking.page').then((m) => m.ClientBookingPage),
  },
];
