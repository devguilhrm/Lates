import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/http/api.service';
import { Scheduling } from '../../core/models/domain.models';

@Component({
  standalone: true,
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Relatórios</h2>
          <p>Indicadores calculados a partir dos agendamentos carregados.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <div class="grid cols-3">
        <article class="panel metric"><span class="muted">Total</span><strong>{{ total() }}</strong></article>
        <article class="panel metric"><span class="muted">Concluídos</span><strong>{{ completed() }}</strong></article>
        <article class="panel metric"><span class="muted">Cancelamentos</span><strong>{{ cancellationRate() }}%</strong></article>
      </div>

      <section class="panel">
        <h3>Ocupação por profissional</h3>
        <table class="table">
          <thead><tr><th>Profissional</th><th>Agendamentos</th></tr></thead>
          <tbody>
            @for (item of occupancy(); track item.name) {
              <tr><td>{{ item.name }}</td><td>{{ item.total }}</td></tr>
            } @empty {
              <tr><td colspan="2" class="muted">Sem dados para exibir.</td></tr>
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
  protected readonly schedulings = signal<Scheduling[]>([]);
  protected readonly total = computed(() => this.schedulings().length);
  protected readonly completed = computed(() => this.schedulings().filter((item) => item.status === 'COMPLETED').length);
  protected readonly cancellationRate = computed(() => {
    if (!this.total()) return 0;
    const cancelled = this.schedulings().filter((item) => item.status === 'CANCELLED').length;
    return Math.round((cancelled / this.total()) * 100);
  });
  protected readonly occupancy = computed(() => {
    const map = new Map<string, number>();
    this.schedulings().forEach((item) => {
      const name = item.professional.user.name;
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.api.getPaginated<Scheduling>('/schedulings', { limit: 100 }).subscribe((result) => this.schedulings.set(result.items));
  }
}
