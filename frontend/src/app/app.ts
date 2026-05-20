import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isAuthenticated()) {
      <div class="shell">
        <button class="sidebar-overlay" type="button" [class.open]="navOpen()" (click)="closeNav()" aria-label="Fechar menu"></button>

        <aside class="sidebar" [class.open]="navOpen()">
          <div class="brand">
            <img class="brand-logo" src="assets/logo.png" alt="Logo LatesOS" />
          </div>

          <nav>
            @if (auth.role() === 'CLIENT') {
              <a routerLink="/my-schedule" routerLinkActive="active" (click)="closeNav()">Meus agendamentos</a>
            } @else {
              <a routerLink="/dashboard" routerLinkActive="active" (click)="closeNav()">Dashboard</a>
              <a routerLink="/clients" routerLinkActive="active" (click)="closeNav()">Clientes</a>
              <a routerLink="/professionals" routerLinkActive="active" (click)="closeNav()">Profissionais</a>
              <a routerLink="/scheduling" routerLinkActive="active" (click)="closeNav()">Agenda</a>
              <a routerLink="/reports" routerLinkActive="active" (click)="closeNav()">Relatorios</a>
              <a routerLink="/finance" routerLinkActive="active" (click)="closeNav()">Financeiro</a>
              <a routerLink="/services" routerLinkActive="active" (click)="closeNav()">Servicos</a>
            }
          </nav>
        </aside>

        <section class="workspace">
          <header class="topbar">
            <div class="topbar-left">
              <button type="button" class="menu-button" (click)="toggleNav()" aria-label="Abrir menu">&#9776;</button>
              <div>
                <span class="eyebrow">Operacao da clinica</span>
                <h1>
                  {{ auth.role() === 'CLIENT' ? 'LatesOS | Area do cliente' : 'LatesOS | Gestao de agenda, alunos e profissionais' }}
                </h1>
              </div>
            </div>
            <div class="actions">
              <button type="button" class="ghost-button" (click)="theme.toggle()" aria-label="Alternar tema">
                Tema: {{ theme.mode() === 'dark' ? 'Claro' : 'Escuro' }}
              </button>
              <button type="button" class="ghost-button" (click)="auth.logout()">Sair</button>
            </div>
          </header>
          <main class="content">
            <router-outlet />
          </main>
        </section>
      </div>
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
  protected readonly navOpen = signal(false);

  protected toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }
}
