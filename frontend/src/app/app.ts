import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isAuthenticated()) {
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">P</span>
          <div>
            <strong>PilatesOS</strong>
            <small>Clinic workspace</small>
          </div>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/clients" routerLinkActive="active">Clientes</a>
          <a routerLink="/professionals" routerLinkActive="active">Profissionais</a>
          <a routerLink="/scheduling" routerLinkActive="active">Agenda</a>
          <a routerLink="/reports" routerLinkActive="active">Relatórios</a>
        </nav>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div>
            <span class="eyebrow">Operação da clínica</span>
            <h1>Gestão de agenda, alunos e profissionais</h1>
          </div>
          <div class="actions">
            <button type="button" class="icon-button" (click)="theme.toggle()" aria-label="Alternar tema">
              {{ theme.mode() === 'dark' ? '☀' : '☾' }}
            </button>
            <button type="button" class="ghost-button" (click)="auth.logout()">Sair</button>
          </div>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </section>
    } @else {
      <router-outlet />
    }
  `,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
}
