import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
          <h2>Agenda</h2>
          <p>Slots disponíveis, criação e acompanhamento de sessões.</p>
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
        <label class="field"><span>Data</span><input type="date" formControlName="date" /></label>
        <label class="field"><span>Duração</span><input type="number" formControlName="duration" /></label>
        <button class="primary-button" type="submit" [disabled]="slotForm.invalid">Buscar slots</button>
      </form>

      <section class="panel">
        <div class="toolbar">
          @for (slot of slots(); track slot.startAt) {
            <button class="secondary-button" type="button" (click)="selectSlot(slot)">
              {{ slot.startAt | date: 'HH:mm' }} - {{ slot.endAt | date: 'HH:mm' }}
            </button>
          } @empty {
            <span class="muted">Nenhum slot carregado.</span>
          }
        </div>
      </section>

      <form class="panel grid cols-3" [formGroup]="bookingForm" (ngSubmit)="create()">
        <label class="field">
          <span>Cliente</span>
          <select formControlName="clientId">
            <option value="">Selecione</option>
            @for (client of clients(); track client.id) {
              <option [value]="client.id">{{ client.user.name }}</option>
            }
          </select>
        </label>
        <label class="field"><span>Início</span><input formControlName="startAt" readonly /></label>
        <label class="field"><span>Fim</span><input formControlName="endAt" readonly /></label>
        <label class="field"><span>Observações</span><textarea formControlName="notes"></textarea></label>
        <div class="field">
          <span>&nbsp;</span>
          <button class="primary-button" type="submit" [disabled]="bookingForm.invalid || saving()">Agendar</button>
        </div>
      </form>

      <section class="panel">
        <table class="table">
          <thead>
            <tr><th>Cliente</th><th>Profissional</th><th>Horário</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            @for (item of schedulings(); track item.id) {
              <tr>
                <td>{{ item.client.user.name }}</td>
                <td>{{ item.professional.user.name }}</td>
                <td>{{ item.startAt | date: 'dd/MM HH:mm' }}</td>
                <td><app-status-badge [status]="item.status" /></td>
                <td class="toolbar">
                  <button class="secondary-button" type="button" (click)="complete(item.id)">Concluir</button>
                  <button class="danger-button" type="button" (click)="cancel(item.id)">Cancelar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">Nenhum agendamento encontrado.</td></tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  protected readonly clients = signal<Client[]>([]);
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly slots = signal<TimeSlot[]>([]);
  protected readonly schedulings = signal<Scheduling[]>([]);
  protected readonly saving = signal(false);

  protected readonly slotForm = this.fb.nonNullable.group({
    professionalId: ['', Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    duration: [60, [Validators.required, Validators.min(15)]],
  });

  protected readonly bookingForm = this.fb.nonNullable.group({
    clientId: ['', Validators.required],
    professionalId: ['', Validators.required],
    startAt: ['', Validators.required],
    endAt: ['', Validators.required],
    notes: [''],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.api.getPaginated<Client>('/clients', { limit: 100 }).subscribe((result) => this.clients.set(result.items));
    this.api.getPaginated<Professional>('/professionals', { limit: 100 }).subscribe((result) => this.professionals.set(result.items));
    this.api.getPaginated<Scheduling>('/schedulings', { limit: 100 }).subscribe((result) => this.schedulings.set(result.items));
  }

  protected loadSlots(): void {
    const value = this.slotForm.getRawValue();
    this.api
      .get<TimeSlot[]>(`/professionals/${value.professionalId}/slots`, { date: value.date, duration: value.duration })
      .subscribe((slots) => this.slots.set(slots));
  }

  protected selectSlot(slot: TimeSlot): void {
    this.bookingForm.patchValue({
      professionalId: this.slotForm.controls.professionalId.value,
      startAt: slot.startAt,
      endAt: slot.endAt,
    });
  }

  protected create(): void {
    if (this.bookingForm.invalid) return;
    this.saving.set(true);
    this.api.post<Scheduling>('/schedulings', this.bookingForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected complete(id: string): void {
    this.api.patch<Scheduling>(`/schedulings/${id}/complete`, {}).subscribe(() => this.load());
  }

  protected cancel(id: string): void {
    this.api.patch<Scheduling>(`/schedulings/${id}/cancel`, { reason: 'Cancelado pela recepção' }).subscribe(() => this.load());
  }
}
