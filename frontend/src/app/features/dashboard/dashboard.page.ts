import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import { Client, Professional, Scheduling } from '../../core/models/domain.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  standalone: true,
  imports: [DatePipe, StatusBadgeComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumo operacional para acompanhar a rotina da clínica.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <div class="grid cols-3">
        <article class="panel metric"><span class="muted">Clientes</span><strong>{{ clients().length }}</strong></article>
        <article class="panel metric"><span class="muted">Profissionais</span><strong>{{ professionals().length }}</strong></article>
        <article class="panel metric"><span class="muted">Agendamentos</span><strong>{{ schedulings().length }}</strong></article>
      </div>

      <section class="panel">
        <h3>Próximos registros</h3>
        <table class="table">
          <thead>
            <tr><th>Cliente</th><th>Profissional</th><th>Data</th><th>Status</th></tr>
          </thead>
          <tbody>
            @for (item of recentSchedulings(); track item.id) {
              <tr>
                <td>{{ item.client.user.name }}</td>
                <td>{{ item.professional.user.name }}</td>
                <td>{{ item.startAt | date: 'dd/MM HH:mm' }}</td>
                <td><app-status-badge [status]="item.status" /></td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted">Nenhum agendamento encontrado.</td></tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly api = inject(ApiService);
  protected readonly clients = signal<Client[]>([]);
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly schedulings = signal<Scheduling[]>([]);
  protected readonly recentSchedulings = computed(() => this.schedulings().slice(0, 6));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.api.getPaginated<Client>('/clients', { limit: 100 }).subscribe((result) => this.clients.set(result.items));
    this.api.getPaginated<Professional>('/professionals', { limit: 100 }).subscribe((result) => this.professionals.set(result.items));
    this.api.getPaginated<Scheduling>('/schedulings', { limit: 100 }).subscribe((result) => this.schedulings.set(result.items));
  }
}
