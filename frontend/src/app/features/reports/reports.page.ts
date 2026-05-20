import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { Client, Professional, Scheduling } from '../../core/models/domain.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, StatusBadgeComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Relatorios</h2>
          <p>Analise gerencial de eficiencia e auditoria de abertura dos agendamentos.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <form class="panel toolbar" [formGroup]="filtersForm" (ngSubmit)="load()">
        <label class="field">
          <span>Data inicio</span>
          <input type="date" formControlName="startDate" />
        </label>
        <label class="field">
          <span>Data fim</span>
          <input type="date" formControlName="endDate" />
        </label>
        <label class="field">
          <span>Profissional</span>
          <select formControlName="professionalId">
            <option value="">Todos</option>
            @for (professional of professionals(); track professional.id) {
              <option [value]="professional.id">{{ professional.user.name }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Cliente</span>
          <select formControlName="clientId">
            <option value="">Todos</option>
            @for (client of clients(); track client.id) {
              <option [value]="client.id">{{ client.user.name }}</option>
            }
          </select>
        </label>
        <button class="primary-button" type="submit">Aplicar filtros</button>
      </form>

      <div class="grid cols-3">
        <article class="panel metric"><span class="muted">Total</span><strong>{{ total() }}</strong></article>
        <article class="panel metric"><span class="muted">Concluidos</span><strong>{{ completed() }}</strong></article>
        <article class="panel metric"><span class="muted">Taxa cancelamento</span><strong>{{ cancellationRate() }}%</strong></article>
      </div>

      <section class="panel">
        <h3>Ocupacao profissional -> relatorio de eficiencia</h3>
        <table class="table">
          <thead><tr><th>Profissional</th><th>Agendamentos</th><th>Concluidos</th><th>Cancelados</th><th>Eficiencia</th></tr></thead>
          <tbody>
            @for (item of occupancy(); track item.name) {
              <tr>
                <td>{{ item.name }}</td>
                <td>{{ item.total }}</td>
                <td>{{ item.completed }}</td>
                <td>{{ item.cancelled }}</td>
                <td>{{ item.efficiency }}%</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">Sem dados para exibir.</td></tr>
            }
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>Auditoria de abertura</h3>
        <table class="table">
          <thead>
            <tr><th>Data</th><th>Cliente</th><th>Profissional</th><th>Aberto por</th><th>Status</th><th>Cancelamento</th></tr>
          </thead>
          <tbody>
            @for (item of schedulings(); track item.id) {
              <tr>
                <td>{{ item.startAt | date: 'dd/MM HH:mm' }}</td>
                <td>{{ item.client.user.name }}</td>
                <td>{{ item.professional.user.name }}</td>
                <td>{{ item.createdBy?.name || 'Nao informado' }}</td>
                <td><app-status-badge [status]="item.status" /></td>
                <td>{{ cancellationLabel(item) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted">Sem agendamentos para auditoria.</td></tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly schedulings = signal<Scheduling[]>([]);
  protected readonly clients = signal<Client[]>([]);
  protected readonly professionals = signal<Professional[]>([]);

  protected readonly filtersForm = this.fb.nonNullable.group({
    startDate: [''],
    endDate: [''],
    professionalId: [''],
    clientId: [''],
  });

  protected readonly total = computed(() => this.schedulings().length);
  protected readonly completed = computed(() => this.schedulings().filter((item) => item.status === 'COMPLETED').length);
  protected readonly cancellationRate = computed(() => {
    if (!this.total()) return 0;
    const cancelled = this.schedulings().filter((item) => item.status === 'CANCELLED').length;
    return Math.round((cancelled / this.total()) * 100);
  });

  protected readonly occupancy = computed(() => {
    const map = new Map<string, { total: number; completed: number; cancelled: number }>();
    this.schedulings().forEach((item) => {
      const name = item.professional.user.name;
      const current = map.get(name) ?? { total: 0, completed: 0, cancelled: 0 };
      current.total += 1;
      if (item.status === 'COMPLETED') current.completed += 1;
      if (item.status === 'CANCELLED') current.cancelled += 1;
      map.set(name, current);
    });

    return Array.from(map.entries()).map(([name, metrics]) => ({
      name,
      ...metrics,
      efficiency: metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0,
    }));
  });

  constructor() {
    this.loadReferenceData();
    this.load();
  }

  protected load(): void {
    const filters = this.filtersForm.getRawValue();
    this.api
      .getPaginated<Scheduling>('/schedulings', {
        limit: 300,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        professionalId: filters.professionalId || undefined,
        clientId: filters.clientId || undefined,
      })
      .subscribe((result) => this.schedulings.set(result.items));
  }

  protected cancellationLabel(item: Scheduling): string {
    if (item.status !== 'CANCELLED') return '-';

    if (item.cancellationType === 'PROFESSIONAL_CANCELLED') {
      return `Profissional desmarcou${item.cancellationReason ? `: ${item.cancellationReason}` : ''}`;
    }
    if (item.cancellationType === 'NO_SHOW') {
      return `Cliente nao compareceu${item.cancellationReason ? `: ${item.cancellationReason}` : ''}`;
    }
    return `Cliente desmarcou${item.cancellationReason ? `: ${item.cancellationReason}` : ''}`;
  }

  private loadReferenceData(): void {
    this.api.getPaginated<Client>('/clients', { limit: 200 }).subscribe((result) => this.clients.set(result.items));
    this.api
      .getPaginated<Professional>('/professionals', { limit: 200 })
      .subscribe((result) => this.professionals.set(result.items));
  }
}
