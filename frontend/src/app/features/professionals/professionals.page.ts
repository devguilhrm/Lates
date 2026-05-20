import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { Availability, DayOfWeek, Professional } from '../../core/models/domain.models';

interface DayOption {
  value: DayOfWeek;
  label: string;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Profissionais</h2>
          <p>Especialidades, disponibilidade, busca por nome e manutencao da equipe.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <form class="panel grid cols-3" [formGroup]="form" (ngSubmit)="save()">
        <label class="field"><span>Nome</span><input formControlName="name" /></label>
        <label class="field"><span>E-mail</span><input type="email" formControlName="email" /></label>
        <label class="field"><span>Senha inicial</span><input type="password" formControlName="password" /></label>
        <label class="field"><span>Telefone</span><input formControlName="phone" /></label>
        <label class="field"><span>Bio</span><textarea formControlName="bio"></textarea></label>
        <label class="field"><span>Especialidade extra</span><input formControlName="extraSpecialty" placeholder="Ex: Osteopatia" /></label>

        <section class="specialties-box full-width">
          <h3>Especialidades (multi-select)</h3>
          <div class="specialties-grid">
            @for (option of specialtyOptions; track option) {
              <label class="specialty-item" [class.selected]="selectedSpecialties().includes(option)">
                <input
                  type="checkbox"
                  [checked]="selectedSpecialties().includes(option)"
                  [attr.aria-label]="option"
                  (change)="toggleSpecialty(option, $any($event.target).checked)"
                />
                <span class="dot"></span>
                <span>{{ option }}</span>
              </label>
            }
          </div>
        </section>

        <section class="availability-box full-width">
          <h3>Disponibilidade no cadastro</h3>
          <div class="availability-days">
            @for (day of dayOptions; track day.value) {
              <button
                type="button"
                class="day-chip"
                [class.active]="selectedDays().includes(day.value)"
                (click)="toggleDay(day.value)"
              >
                {{ day.label }}
              </button>
            }
          </div>

          <div class="availability-grid">
            <label class="field"><span>Inicio</span><input type="time" formControlName="availabilityStart" /></label>
            <label class="field"><span>Fim</span><input type="time" formControlName="availabilityEnd" /></label>
            <label class="field"><span>Max clientes simultaneos</span><input type="number" min="1" formControlName="maxConcurrentClients" /></label>
          </div>
        </section>

        <div class="field">
          <span>&nbsp;</span>
          <button class="primary-button" type="submit" [disabled]="form.invalid || saving() || selectedSpecialties().length === 0">
            {{ editingProfessionalId() ? 'Atualizar profissional' : 'Cadastrar profissional' }}
          </button>
        </div>
        @if (editingProfessionalId()) {
          <div class="field">
            <span>&nbsp;</span>
            <button class="secondary-button" type="button" (click)="cancelEdit()">Cancelar edicao</button>
          </div>
        }
      </form>

      <section class="panel toolbar">
        <label class="field search-field">
          <span>Buscar por nome</span>
          <input [value]="search()" (input)="onSearch($any($event.target).value)" placeholder="Digite o nome do profissional" />
        </label>
      </section>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="panel">
        <table class="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Especialidades</th><th>Disponibilidade</th><th>Acoes</th></tr>
          </thead>
          <tbody>
            @for (professional of professionals(); track professional.id) {
              <tr>
                <td>{{ professional.user.name }}</td>
                <td>{{ professional.user.email }}</td>
                <td>{{ professional.specialty }}</td>
                <td>{{ availabilitySummary(professional.availabilities) }}</td>
                <td class="toolbar">
                  <button class="secondary-button" type="button" (click)="edit(professional)">Editar</button>
                  <button class="danger-button" type="button" (click)="remove(professional)">Excluir</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">Nenhum profissional encontrado.</td></tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
  styles: `
    .search-field {
      min-width: 18rem;
    }

    .full-width {
      grid-column: 1 / -1;
      padding: 0.75rem 0;
    }

    .full-width h3 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
    }

    .specialties-box,
    .availability-box {
      border-top: 1px dashed var(--line);
      margin-top: 0.25rem;
      padding-top: 1rem;
    }

    .specialties-grid {
      display: grid;
      gap: 0.6rem;
      grid-template-columns: repeat(auto-fit, minmax(13.5rem, 1fr));
    }

    .specialty-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text);
      background: var(--surface-strong);
      border: 1px solid var(--line);
      border-radius: 0.65rem;
      padding: 0.62rem 0.72rem;
      min-height: 2.8rem;
      cursor: pointer;
      transition: border-color 140ms ease, background 140ms ease, color 140ms ease, transform 140ms ease;
    }

    .specialty-item:hover {
      border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
      transform: translateY(-1px);
    }

    .specialty-item input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .specialty-item .dot {
      width: 0.82rem;
      height: 0.82rem;
      border-radius: 999px;
      border: 2px solid color-mix(in srgb, var(--muted) 55%, transparent);
      background: transparent;
      flex: 0 0 auto;
    }

    .specialty-item.selected {
      border-color: color-mix(in srgb, var(--success) 60%, var(--line));
      background: color-mix(in srgb, var(--success) 18%, var(--surface-strong));
      color: var(--success);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 22%, transparent);
    }

    .specialty-item.selected .dot {
      background: var(--success);
      border-color: var(--success);
    }

    .availability-days {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.8rem;
    }

    .day-chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.4rem 0.75rem;
      background: var(--surface-strong);
      color: var(--text);
      font-weight: 700;
      cursor: pointer;
    }

    .day-chip.active {
      border-color: color-mix(in srgb, var(--success) 60%, var(--line));
      background: color-mix(in srgb, var(--success) 20%, var(--surface-strong));
      color: var(--success);
    }

    .availability-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.7rem;
    }

    @media (max-width: 860px) {
      .specialties-grid {
        grid-template-columns: 1fr;
      }

      .availability-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  protected readonly dayOptions: DayOption[] = [
    { value: 'MON', label: 'Seg' },
    { value: 'TUE', label: 'Ter' },
    { value: 'WED', label: 'Qua' },
    { value: 'THU', label: 'Qui' },
    { value: 'FRI', label: 'Sex' },
    { value: 'SAT', label: 'Sab' },
    { value: 'SUN', label: 'Dom' },
  ];

  protected readonly specialtyOptions = [
    'Pilates solo',
    'Pilates aparelhos',
    'Fisioterapia ortopedica',
    'Fisioterapia neurologica',
    'Reabilitacao postural',
    'Treino funcional terapeutico',
  ];

  protected readonly professionals = signal<Professional[]>([]);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly selectedSpecialties = signal<string[]>(['Pilates aparelhos']);
  protected readonly selectedDays = signal<DayOfWeek[]>(['MON', 'WED', 'FRI']);
  protected readonly editingProfessionalId = signal<string | null>(null);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['prof123', [Validators.minLength(6)]],
    phone: [''],
    bio: [''],
    extraSpecialty: [''],
    availabilityStart: ['08:00', Validators.required],
    availabilityEnd: ['18:00', Validators.required],
    maxConcurrentClients: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.api
      .getPaginated<Professional>('/professionals', { limit: 100, search: this.search() || undefined })
      .subscribe({
        next: (result) => this.professionals.set(result.items),
        error: () => this.error.set('Nao foi possivel carregar profissionais.'),
      });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.load();
  }

  protected toggleSpecialty(option: string, checked: boolean): void {
    const current = new Set(this.selectedSpecialties());
    if (checked) current.add(option);
    else current.delete(option);
    this.selectedSpecialties.set(Array.from(current));
  }

  protected toggleDay(day: DayOfWeek): void {
    const current = new Set(this.selectedDays());
    if (current.has(day)) current.delete(day);
    else current.add(day);
    this.selectedDays.set(Array.from(current));
  }

  protected save(): void {
    if (this.form.invalid || this.selectedSpecialties().length === 0) return;

    this.saving.set(true);
    this.error.set('');

    const payload = this.form.getRawValue();
    const specialtyString = this.joinSpecialties(payload.extraSpecialty);
    const editingId = this.editingProfessionalId();

    const request = editingId
      ? this.api.patch<Professional>(`/professionals/${editingId}`, {
          ...payload,
          specialty: specialtyString,
          password: payload.password?.trim() ? payload.password : undefined,
        })
      : this.api.post<Professional>('/professionals', {
          ...payload,
          specialty: specialtyString,
          password: payload.password?.trim() || 'prof123',
        });

    request.subscribe({
      next: (professional) => this.persistAvailability(professional.id),
      error: () => {
        this.error.set('Nao foi possivel salvar o profissional.');
        this.saving.set(false);
      },
    });
  }

  protected edit(professional: Professional): void {
    this.editingProfessionalId.set(professional.id);

    const parsedSpecialties = professional.specialty
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const known = parsedSpecialties.filter((item) => this.specialtyOptions.includes(item));
    const extra = parsedSpecialties.filter((item) => !this.specialtyOptions.includes(item)).join(', ');

    const availabilities = professional.availabilities ?? [];
    const selectedDays = availabilities.map((item) => item.dayOfWeek);
    const firstAvailability = availabilities[0];

    this.selectedSpecialties.set(known.length ? known : ['Pilates aparelhos']);
    this.selectedDays.set(selectedDays.length ? selectedDays : ['MON', 'WED', 'FRI']);

    this.form.reset({
      name: professional.user.name,
      email: professional.user.email,
      password: '',
      phone: professional.user.phone ?? '',
      bio: professional.bio ?? '',
      extraSpecialty: extra,
      availabilityStart: firstAvailability?.startTime ?? '08:00',
      availabilityEnd: firstAvailability?.endTime ?? '18:00',
      maxConcurrentClients: firstAvailability?.maxConcurrentClients ?? 1,
    });
  }

  protected cancelEdit(): void {
    this.editingProfessionalId.set(null);
    this.selectedSpecialties.set(['Pilates aparelhos']);
    this.selectedDays.set(['MON', 'WED', 'FRI']);
    this.form.reset({
      name: '',
      email: '',
      password: 'prof123',
      phone: '',
      bio: '',
      extraSpecialty: '',
      availabilityStart: '08:00',
      availabilityEnd: '18:00',
      maxConcurrentClients: 1,
    });
  }

  protected remove(professional: Professional): void {
    const shouldDelete = confirm(`Excluir profissional ${professional.user.name}?`);
    if (!shouldDelete) return;

    this.api.delete(`/professionals/${professional.id}`).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Nao foi possivel excluir o profissional.'),
    });
  }

  protected availabilitySummary(items?: Availability[]): string {
    if (!items?.length) return 'Sem disponibilidade';

    const days = items.map((item) => this.dayOptions.find((day) => day.value === item.dayOfWeek)?.label ?? item.dayOfWeek);
    const first = items[0];
    return `${days.join(', ')} | ${first.startTime} - ${first.endTime}`;
  }

  private persistAvailability(professionalId: string): void {
    const payload = this.buildAvailabilityPayload();

    this.api.post(`/professionals/${professionalId}/availability`, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.load();
      },
      error: () => {
        this.error.set('Profissional salvo, mas houve erro ao salvar disponibilidade.');
        this.saving.set(false);
      },
    });
  }

  private buildAvailabilityPayload(): Availability[] {
    const value = this.form.getRawValue();
    return this.selectedDays().map((dayOfWeek) => ({
      dayOfWeek,
      startTime: value.availabilityStart,
      endTime: value.availabilityEnd,
      maxConcurrentClients: Number(value.maxConcurrentClients),
    }));
  }

  private joinSpecialties(extraSpecialty: string): string {
    const base = [...this.selectedSpecialties()];
    const extras = extraSpecialty
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return [...base, ...extras].join(', ');
  }
}
