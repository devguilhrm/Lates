import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'clients',
    loadComponent: () => import('./features/clients/clients.page').then((m) => m.ClientsPage),
  },
  {
    path: 'professionals',
    loadComponent: () => import('./features/professionals/professionals.page').then((m) => m.ProfessionalsPage),
  },
  {
    path: 'scheduling',
    loadComponent: () => import('./features/scheduling/scheduling.page').then((m) => m.SchedulingPage),
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
  },
];
