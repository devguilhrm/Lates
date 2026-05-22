import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ApiService } from './core/http/api.service';
import { InternalNotification, InternalNotificationInbox } from './core/models/domain.models';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe, RouterOutlet, RouterLink, RouterLinkActive],
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
              @if (canSeeNotifications()) {
                <div class="notifications-wrapper">
                  <button
                    type="button"
                    class="icon-button notification-button"
                    (click)="toggleNotificationsPanel()"
                    aria-label="Abrir notificacoes"
                  >
                    <span class="notification-icon">!</span>
                    @if (unreadNotifications() > 0) {
                      <span class="notification-badge">{{ unreadNotifications() }}</span>
                    }
                  </button>
                  @if (notificationsPanelOpen()) {
                    <section class="notifications-panel">
                      <header>
                        <strong>Notificacoes</strong>
                        <small>{{ unreadNotifications() }} nao lidas</small>
                      </header>
                      <div class="notifications-list">
                        @if (notificationsLoading()) {
                          <p class="muted">Carregando...</p>
                        } @else {
                          @for (item of notifications(); track item.id) {
                            <article class="notification-item" [class.unread]="!item.isRead">
                              <h4>{{ item.title }}</h4>
                              <p>{{ item.message }}</p>
                              <div class="notification-meta">
                                <small>{{ item.createdAt | date: 'dd/MM HH:mm' }}</small>
                                <div class="notification-actions">
                                  @if (item.schedulingId && !item.isRead) {
                                    <button type="button" class="ghost-button" (click)="checkInFromNotification(item)">
                                      Confirmar presenca
                                    </button>
                                  }
                                  @if (!item.isRead) {
                                    <button type="button" class="ghost-button" (click)="markNotificationAsRead(item.id)">
                                      Marcar lida
                                    </button>
                                  }
                                </div>
                              </div>
                            </article>
                          } @empty {
                            <p class="muted">Sem notificacoes no momento.</p>
                          }
                        }
                      </div>
                    </section>
                  }
                </div>
              }
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
  private readonly api = inject(ApiService);
  protected readonly navOpen = signal(false);
  protected readonly notifications = signal<InternalNotification[]>([]);
  protected readonly unreadNotifications = signal(0);
  protected readonly notificationsPanelOpen = signal(false);
  protected readonly notificationsLoading = signal(false);
  protected readonly canSeeNotifications = computed(() => {
    const role = this.auth.role();
    return this.auth.isAuthenticated() && (role === 'ADMIN' || role === 'RECEPTIONIST');
  });

  private readonly notificationsPollingEffect = effect((onCleanup) => {
    if (!this.canSeeNotifications()) {
      this.notifications.set([]);
      this.unreadNotifications.set(0);
      this.notificationsPanelOpen.set(false);
      return;
    }

    this.loadNotifications();
    const timer = window.setInterval(() => this.loadNotifications(), 15000);
    onCleanup(() => window.clearInterval(timer));
  });

  protected toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected toggleNotificationsPanel(): void {
    this.notificationsPanelOpen.update((open) => !open);
    if (this.notificationsPanelOpen()) this.loadNotifications();
  }

  protected markNotificationAsRead(id: string): void {
    this.api.patch(`/notifications/${id}/read`, {}).subscribe(() => this.loadNotifications());
  }

  protected checkInFromNotification(item: InternalNotification): void {
    if (!item.schedulingId) return;

    this.api.patch(`/schedulings/${item.schedulingId}/check-in`, {}).subscribe({
      next: () => {
        this.api.patch(`/notifications/${item.id}/read`, {}).subscribe(() => this.loadNotifications());
      },
      error: (error) => {
        const message =
          error?.error?.message || error?.message || 'Nao foi possivel confirmar presenca.';
        alert(message);
      },
    });
  }

  private loadNotifications(): void {
    if (!this.canSeeNotifications()) return;

    this.notificationsLoading.set(true);
    this.api.get<InternalNotificationInbox>('/notifications/inbox', { limit: 20 }).subscribe({
      next: (inbox) => {
        this.notifications.set(inbox.items);
        this.unreadNotifications.set(inbox.unreadCount);
        this.notificationsLoading.set(false);
      },
      error: () => this.notificationsLoading.set(false),
    });
  }
}
