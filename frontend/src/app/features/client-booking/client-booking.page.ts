import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { Client, Professional, Scheduling, TimeSlot } from '../../core/models/domain.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, StatusBadgeComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Meu agendamento</h2>
          <p>Escolha profissional, horario disponivel e confirme sua aula em poucos toques.</p>
        </div>
        <button class="secondary-button" type="button" (click)="loadInitialData()">Atualizar</button>
      </header>

      <section class="panel customer-status">
        <div>
          <strong>{{ me()?.user?.name || 'Cliente' }}</strong>
          <p class="muted">Plano: {{ planLabel(me()?.plan) }}</p>
        </div>
        <div>
          <strong>{{ me()?.creditsRemaining ?? 0 }}</strong>
          <p class="muted">Creditos disponiveis</p>
        </div>
        <div>
          <strong>{{ billingLabel() }}</strong>
          <p class="muted">Mensalidade</p>
        </div>
      </section>

      <form class="panel grid cols-3" [formGroup]="slotForm" (ngSubmit)="loadSlots()">
        <label class="field">
          <span>Profissional</span>
          <select formControlName="professionalId">
            <option value="">Selecione</option>
            @for (professional of professionals(); track professional.id) {
              <option [value]="professional.id">{{ professional.user.name }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Data</span>
          <input type="date" formControlName="date" [min]="todayDate()" />
        </label>
        <label class="field">
          <span>Duracao</span>
          <select formControlName="duration">
            <option value="30">30 min</option>
            <option value="60">1h</option>
          </select>
        </label>
        <div class="field">
          <span>&nbsp;</span>
          <button class="primary-button" type="submit" [disabled]="slotForm.invalid">Buscar horarios</button>
        </div>
      </form>

      <section class="panel slots">
        @for (slot of slots(); track slot.startAt) {
          <button
            class="secondary-button"
            type="button"
            [class.selected]="isSelected(slot)"
            (click)="selectedSlot.set(slot)"
          >
            {{ slot.startAt | date: 'dd/MM HH:mm' }} - {{ slot.endAt | date: 'HH:mm' }}
          </button>
        } @empty {
          <p class="muted">Nenhum horario carregado.</p>
        }
      </section>

      <section class="panel toolbar">
        <button
          class="primary-button"
          type="button"
          [disabled]="!canBook() || saving()"
          (click)="book()"
        >
          {{ saving() ? 'Agendando...' : 'Confirmar agendamento' }}
        </button>
      </section>

      <section class="panel">
        <h3>Proximos agendamentos</h3>
        <table class="table">
          <thead>
            <tr><th>Profissional</th><th>Horario</th><th>Status</th><th>Acao</th></tr>
          </thead>
          <tbody>
            @for (item of mySchedulings(); track item.id) {
              <tr>
                <td>{{ item.professional.user.name }}</td>
                <td>{{ item.startAt | date: 'dd/MM HH:mm' }}</td>
                <td><app-status-badge [status]="item.status" /></td>
                <td>
                  <button
                    class="danger-button"
                    type="button"
                    [disabled]="item.status !== 'SCHEDULED'"
                    (click)="cancel(item.id)"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted">Voce ainda nao possui agendamentos.</td></tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
  styles: `
    .customer-status {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
      gap: 0.85rem;
      align-items: center;
    }

    .slots {
      display: flex;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .selected {
      outline: 2px solid var(--accent);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientBookingPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly me = signal<Client | null>(null);
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly slots = signal<TimeSlot[]>([]);
  protected readonly selectedSlot = signal<TimeSlot | null>(null);
  protected readonly mySchedulings = signal<Scheduling[]>([]);
  protected readonly saving = signal(false);

  protected readonly slotForm = this.fb.nonNullable.group({
    professionalId: ['', Validators.required],
    date: [this.todayDate(), Validators.required],
    duration: [60, Validators.required],
  });

  protected readonly canBook = computed(() => !!this.selectedSlot() && !!this.me());

  constructor() {
    this.loadInitialData();
  }

  protected loadInitialData(): void {
    this.api.get<Client>('/clients/me').subscribe((client) => this.me.set(client));
    this.api
      .getPaginated<Professional>('/professionals', { limit: 100 })
      .subscribe((result) => this.professionals.set(result.items));
    this.loadMySchedulings();
  }

  protected loadSlots(): void {
    const form = this.slotForm.getRawValue();
    this.api
      .get<TimeSlot[]>(`/professionals/${form.professionalId}/slots`, {
        date: form.date,
        duration: form.duration,
      })
      .subscribe((slots) => {
        this.slots.set(slots);
        this.selectedSlot.set(null);
      });
  }

  protected isSelected(slot: TimeSlot): boolean {
    const current = this.selectedSlot();
    return !!current && current.startAt === slot.startAt && current.endAt === slot.endAt;
  }

  protected book(): void {
    const slot = this.selectedSlot();
    const me = this.me();
    if (!slot || !me) return;

    this.saving.set(true);
    this.api
      .post<Scheduling>('/schedulings', {
        clientId: me.id,
        professionalId: this.slotForm.controls.professionalId.value,
        startAt: slot.startAt,
        endAt: slot.endAt,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.selectedSlot.set(null);
          this.loadInitialData();
        },
        error: () => this.saving.set(false),
      });
  }

  protected cancel(schedulingId: string): void {
    this.api
      .patch(`/schedulings/${schedulingId}/cancel`, {
        type: 'CLIENT_CANCELLED',
      })
      .subscribe(() => this.loadInitialData());
  }

  protected billingLabel(): string {
    const status = this.me()?.subscriptionStatus;
    if (status === 'PAID' || status === 'NOT_APPLICABLE') return 'Em dia';
    if (status === 'OVERDUE') return 'Atrasado';
    if (status === 'PENDING') return 'Pendente';
    return '-';
  }

  protected planLabel(plan?: Client['plan']): string {
    if (plan === 'ANNUAL') return 'Anual';
    if (plan === 'QUARTERLY') return 'Trimestral';
    if (plan === 'CREDIT_PACK') return 'Pacote de creditos';
    return 'Mensal';
  }

  protected todayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadMySchedulings(): void {
    this.api
      .getPaginated<Scheduling>('/schedulings', { limit: 50 })
      .subscribe((result) => this.mySchedulings.set(result.items));
  }
}
