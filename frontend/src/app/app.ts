import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <h1>PilatesOS</h1>
      <nav>
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/clients" routerLinkActive="active">Clientes</a>
        <a routerLink="/professionals" routerLinkActive="active">Profissionais</a>
        <a routerLink="/scheduling" routerLinkActive="active">Agendamentos</a>
        <a routerLink="/reports" routerLinkActive="active">Relatórios</a>
      </nav>
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
