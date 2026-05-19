import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { DayOfWeek, Professional } from '../../core/models/domain.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Profissionais</h2>
          <p>Equipe, especialidades e disponibilidade padrão.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <form class="panel grid cols-3" [formGroup]="form" (ngSubmit)="create()">
        <label class="field"><span>Nome</span><input formControlName="name" /></label>
        <label class="field"><span>E-mail</span><input type="email" formControlName="email" /></label>
        <label class="field"><span>Senha inicial</span><input type="password" formControlName="password" /></label>
        <label class="field"><span>Telefone</span><input formControlName="phone" /></label>
        <label class="field"><span>Especialidade</span><input formControlName="specialty" /></label>
        <label class="field"><span>Bio</span><textarea formControlName="bio"></textarea></label>
        <div class="field">
          <span>&nbsp;</span>
          <button class="primary-button" type="submit" [disabled]="form.invalid || saving()">Cadastrar profissional</button>
        </div>
      </form>

      <section class="panel">
        <table class="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Especialidade</th><th>Disponibilidade rápida</th></tr>
          </thead>
          <tbody>
            @for (professional of professionals(); track professional.id) {
              <tr>
                <td>{{ professional.user.name }}</td>
                <td>{{ professional.user.email }}</td>
                <td>{{ professional.specialty }}</td>
                <td>
                  <button class="secondary-button" type="button" (click)="setBusinessHours(professional.id)">
                    Seg-Sex 08-18
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted">Nenhum profissional cadastrado.</td></tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['prof123', [Validators.required, Validators.minLength(6)]],
    phone: [''],
    specialty: ['Pilates Aparelhos', [Validators.required, Validators.minLength(2)]],
    bio: [''],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.api.getPaginated<Professional>('/professionals', { limit: 100 }).subscribe((result) => this.professionals.set(result.items));
  }

  protected create(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.post<Professional>('/professionals', this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({ password: 'prof123', specialty: 'Pilates Aparelhos' });
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected setBusinessHours(id: string): void {
    const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const payload = days.map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '08:00',
      endTime: '18:00',
      maxConcurrentClients: 1,
    }));
    this.api.post(`/professionals/${id}/availability`, payload).subscribe(() => this.load());
  }
}
