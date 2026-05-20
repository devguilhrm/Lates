import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { Client, Professional, Scheduling, TimeSlot } from '../../core/models/domain.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

interface DurationOption {
  value: number;
  label: string;
}

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, StatusBadgeComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Agenda</h2>
          <p>Agendamento, remarcacao e visualizacao em lista ou grade diaria.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <form class="panel toolbar" [formGroup]="slotForm" (ngSubmit)="loadSlots()">
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
            @for (option of durationOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
        <button class="primary-button" type="submit" [disabled]="slotForm.invalid">Buscar agendamento</button>
      </form>

      <section class="panel">
        <div class="toolbar">
          @for (slot of slots(); track slot.startAt) {
            <button class="secondary-button" type="button" (click)="selectSlot(slot)" [class.active-slot]="isSelectedSlot(slot)">
              {{ slot.startAt | date: 'HH:mm' }} - {{ slot.endAt | date: 'HH:mm' }}
            </button>
          } @empty {
            <span class="muted">Nenhum slot carregado para o filtro atual.</span>
          }
        </div>
      </section>

      @if (reschedulingTarget()) {
        <section class="panel remarcacao">
          <h3>Remarcando: {{ reschedulingTarget()?.client?.user?.name }}</h3>
          <p class="muted">
            Horario atual: {{ reschedulingTarget()?.startAt | date: 'dd/MM HH:mm' }}
            com {{ reschedulingTarget()?.professional?.user?.name }}
          </p>
          <button class="secondary-button" type="button" (click)="cancelReschedule()">Cancelar remarcacao</button>
        </section>
      }

      <form class="panel grid cols-3" [formGroup]="bookingForm" (ngSubmit)="submitBooking()">
        <label class="field" [class.disabled]="!!reschedulingTarget()">
          <span>Cliente</span>
          <select formControlName="clientId" [disabled]="!!reschedulingTarget()">
            <option value="">Selecione</option>
            @for (client of clients(); track client.id) {
              <option [value]="client.id">{{ client.user.name }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Agendamento selecionado</span>
          <input [value]="selectedSlotLabel()" readonly />
        </label>
        <label class="field"><span>Observacoes</span><textarea formControlName="notes"></textarea></label>
        <div class="field">
          <span>&nbsp;</span>
          <button class="primary-button" type="submit" [disabled]="!canSubmit() || saving()">
            {{ reschedulingTarget() ? 'Confirmar remarcacao' : 'Agendar' }}
          </button>
        </div>
      </form>

      <section class="panel toolbar">
        <label class="field search-field">
          <span>Buscar agendamento</span>
          <input [value]="search()" (input)="onSearch($any($event.target).value)" placeholder="Cliente, profissional ou recepcao" />
        </label>
        <label class="field">
          <span>Exibicao</span>
          <select [value]="viewMode()" (change)="viewMode.set($any($event.target).value)">
            <option value="list">Lista</option>
            <option value="calendar">Agenda diaria</option>
          </select>
        </label>
      </section>

      @if (viewMode() === 'list') {
        <section class="panel">
          <table class="table">
            <thead>
              <tr><th>Cliente</th><th>Profissional</th><th>Horario</th><th>Status</th><th>Acoes</th></tr>
            </thead>
            <tbody>
              @for (item of schedulings(); track item.id) {
                <tr>
                  <td>{{ item.client.user.name }}</td>
                  <td>{{ item.professional.user.name }}</td>
                  <td>{{ item.startAt | date: 'dd/MM HH:mm' }}</td>
                  <td><app-status-badge [status]="item.status" /></td>
                  <td class="toolbar">
                    <button class="secondary-button" type="button" (click)="startReschedule(item)" [disabled]="item.status !== 'SCHEDULED'">Remarcar</button>
                    <button class="secondary-button" type="button" (click)="complete(item.id)" [disabled]="item.status !== 'SCHEDULED'">Concluir</button>
                    <button class="danger-button" type="button" (click)="cancel(item.id)" [disabled]="item.status !== 'SCHEDULED'">Cancelar</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted">Nenhum agendamento encontrado.</td></tr>
              }
            </tbody>
          </table>
        </section>
      } @else {
        <section class="panel calendar-grid">
          @for (group of groupedByDay(); track group.day) {
            <article class="day-column">
              <h3>{{ group.day | date: 'dd/MM (EEE)' }}</h3>
              <div class="day-items">
                @for (item of group.items; track item.id) {
                  <button class="calendar-card" type="button" (click)="startReschedule(item)">
                    <strong>{{ item.startAt | date: 'HH:mm' }} - {{ item.endAt | date: 'HH:mm' }}</strong>
                    <span>{{ item.client.user.name }}</span>
                    <span>{{ item.professional.user.name }}</span>
                    <app-status-badge [status]="item.status" />
                  </button>
                }
              </div>
            </article>
          } @empty {
            <p class="muted">Sem dados para a visualizacao de agenda.</p>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .active-slot {
      outline: 2px solid var(--accent);
    }

    .search-field {
      min-width: 20rem;
    }

    .remarcacao {
      display: grid;
      gap: 0.6rem;
    }

    .disabled {
      opacity: 0.7;
    }

    .calendar-grid {
      display: grid;
      gap: 0.9rem;
      grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    }

    .day-column {
      border: 1px solid var(--line);
      border-radius: 0.55rem;
      padding: 0.65rem;
      background: var(--background);
    }

    .day-column h3 {
      margin: 0 0 0.55rem;
      font-size: 0.95rem;
    }

    .day-items {
      display: grid;
      gap: 0.55rem;
    }

    .calendar-card {
      border: 1px solid var(--line);
      border-radius: 0.45rem;
      background: var(--surface);
      color: var(--text);
      text-align: left;
      display: grid;
      gap: 0.25rem;
      padding: 0.55rem;
      cursor: pointer;
    }

    .calendar-card strong {
      font-size: 0.86rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  protected readonly durationOptions: DurationOption[] = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1h' },
    { value: 75, label: '1h 15min' },
  ];

  protected readonly clients = signal<Client[]>([]);
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly slots = signal<TimeSlot[]>([]);
  protected readonly schedulings = signal<Scheduling[]>([]);
  protected readonly selectedSlot = signal<TimeSlot | null>(null);
  protected readonly saving = signal(false);
  protected readonly viewMode = signal<'list' | 'calendar'>('list');
  protected readonly search = signal('');
  protected readonly reschedulingTarget = signal<Scheduling | null>(null);

  protected readonly groupedByDay = computed(() => {
    const groups = new Map<string, Scheduling[]>();
    this.schedulings().forEach((item) => {
      const key = new Date(item.startAt).toISOString().slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => ({
        day,
        items: items.sort((left, right) => left.startAt.localeCompare(right.startAt)),
      }));
  });

  protected readonly canSubmit = computed(() => {
    if (!this.selectedSlot()) return false;
    if (this.reschedulingTarget()) return true;
    return this.bookingForm.controls.clientId.valid;
  });

  protected readonly slotForm = this.fb.nonNullable.group({
    professionalId: ['', Validators.required],
    date: [this.todayDate(), Validators.required],
    duration: [60, Validators.required],
  });

  protected readonly bookingForm = this.fb.nonNullable.group({
    clientId: ['', Validators.required],
    notes: [''],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.api.getPaginated<Client>('/clients', { limit: 100 }).subscribe((result) => this.clients.set(result.items));
    this.api.getPaginated<Professional>('/professionals', { limit: 100 }).subscribe((result) => this.professionals.set(result.items));
    this.loadSchedulings();
  }

  protected loadSlots(): void {
    const value = this.slotForm.getRawValue();

    if (value.date < this.todayDate()) {
      alert('Nao e permitido agendar dias anteriores.');
      return;
    }

    this.api
      .get<TimeSlot[]>(`/professionals/${value.professionalId}/slots`, { date: value.date, duration: value.duration })
      .subscribe((slots) => {
        this.slots.set(slots);
        this.selectedSlot.set(null);
      });
  }

  protected selectSlot(slot: TimeSlot): void {
    this.selectedSlot.set(slot);
  }

  protected isSelectedSlot(slot: TimeSlot): boolean {
    const current = this.selectedSlot();
    return !!current && current.startAt === slot.startAt && current.endAt === slot.endAt;
  }

  protected selectedSlotLabel(): string {
    const current = this.selectedSlot();
    if (!current) return 'Nenhum slot selecionado';

    const start = new Date(current.startAt);
    const end = new Date(current.endAt);
    return `${this.dateLabel(start)} ${this.timeLabel(start)} - ${this.timeLabel(end)}`;
  }

  protected submitBooking(): void {
    const slot = this.selectedSlot();
    if (!slot) return;

    this.saving.set(true);

    const target = this.reschedulingTarget();
    const payload = {
      professionalId: this.slotForm.controls.professionalId.value,
      startAt: slot.startAt,
      endAt: slot.endAt,
      notes: this.bookingForm.controls.notes.value,
    };

    const request = target
      ? this.api.patch<Scheduling>(`/schedulings/${target.id}/reschedule`, payload)
      : this.api.post<Scheduling>('/schedulings', {
          ...payload,
          clientId: this.bookingForm.controls.clientId.value,
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.selectedSlot.set(null);
        this.cancelReschedule();
        this.bookingForm.patchValue({ notes: '' });
        this.loadSchedulings();
      },
      error: () => this.saving.set(false),
    });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.loadSchedulings();
  }

  protected startReschedule(item: Scheduling): void {
    if (item.status !== 'SCHEDULED') return;

    const date = this.toDateInput(new Date(item.startAt));
    this.reschedulingTarget.set(item);
    this.slotForm.patchValue({
      professionalId: item.professional.id,
      date,
    });
    this.bookingForm.patchValue({
      clientId: item.client.id,
      notes: item.notes ?? '',
    });
    this.loadSlots();
  }

  protected cancelReschedule(): void {
    this.reschedulingTarget.set(null);
    this.bookingForm.patchValue({ clientId: '', notes: '' });
  }

  protected complete(id: string): void {
    this.api.patch<Scheduling>(`/schedulings/${id}/complete`, {}).subscribe(() => this.loadSchedulings());
  }

  protected cancel(id: string): void {
    const option = prompt(
      'Informe o motivo: 1 = Cliente desmarcou, 2 = Profissional desmarcou, 3 = Cliente nao compareceu',
      '1',
    );
    if (!option) return;

    const type =
      option === '2'
        ? 'PROFESSIONAL_CANCELLED'
        : option === '3'
          ? 'NO_SHOW'
          : option === '1'
            ? 'CLIENT_CANCELLED'
            : null;

    if (!type) {
      alert('Opcao invalida. Use 1, 2 ou 3.');
      return;
    }

    const reason = prompt('Detalhe opcional do cancelamento:', '');

    this.api
      .patch<Scheduling>(`/schedulings/${id}/cancel`, {
        type,
        reason: reason?.trim() || undefined,
      })
      .subscribe(() => this.loadSchedulings());
  }

  protected todayDate(): string {
    return this.toDateInput(new Date());
  }

  private loadSchedulings(): void {
    this.api
      .getPaginated<Scheduling>('/schedulings', { limit: 200, search: this.search() || undefined })
      .subscribe((result) => this.schedulings.set(result.items));
  }

  private dateLabel(value: Date): string {
    return value.toLocaleDateString('pt-BR');
  }

  private timeLabel(value: Date): string {
    return value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  private toDateInput(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
