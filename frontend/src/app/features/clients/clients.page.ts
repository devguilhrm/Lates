import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { Client, PlanType } from '../../core/models/domain.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Clientes</h2>
          <p>Cadastro de alunos, plano ativo e créditos disponíveis.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <form class="panel grid cols-3" [formGroup]="form" (ngSubmit)="create()">
        <label class="field"><span>Nome</span><input formControlName="name" /></label>
        <label class="field"><span>E-mail</span><input type="email" formControlName="email" /></label>
        <label class="field"><span>Senha inicial</span><input type="password" formControlName="password" /></label>
        <label class="field"><span>Telefone</span><input formControlName="phone" /></label>
        <label class="field">
          <span>Plano</span>
          <select formControlName="plan">
            @for (plan of plans; track plan) {
              <option [value]="plan">{{ plan }}</option>
            }
          </select>
        </label>
        <label class="field"><span>Créditos</span><input type="number" formControlName="creditsRemaining" /></label>
        <label class="field"><span>Contato de emergência</span><input formControlName="emergencyContact" /></label>
        <label class="field"><span>Anamnese</span><textarea formControlName="anamnesis"></textarea></label>
        <div class="field">
          <span>&nbsp;</span>
          <button class="primary-button" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Salvando...' : 'Cadastrar cliente' }}
          </button>
        </div>
      </form>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="panel">
        <table class="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Plano</th><th>Créditos</th><th>Status</th></tr>
          </thead>
          <tbody>
            @for (client of clients(); track client.id) {
              <tr>
                <td>{{ client.user.name }}</td>
                <td>{{ client.user.email }}</td>
                <td>{{ client.plan }}</td>
                <td>{{ client.creditsRemaining }}</td>
                <td>{{ client.user.isActive ? 'Ativo' : 'Inativo' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">Nenhum cliente cadastrado.</td></tr>
            }
          </tbody>
        </table>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  protected readonly plans: PlanType[] = ['MONTHLY', 'QUARTERLY', 'CREDIT_PACK'];
  protected readonly clients = signal<Client[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['cliente123', [Validators.required, Validators.minLength(6)]],
    phone: [''],
    plan: ['MONTHLY' as PlanType, Validators.required],
    creditsRemaining: [0, [Validators.required, Validators.min(0)]],
    emergencyContact: [''],
    anamnesis: [''],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.api.getPaginated<Client>('/clients', { limit: 100 }).subscribe({
      next: (result) => this.clients.set(result.items),
      error: () => this.error.set('Não foi possível carregar clientes.'),
    });
  }

  protected create(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    this.api.post<Client>('/clients', this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({ password: 'cliente123', plan: 'MONTHLY', creditsRemaining: 0 });
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.error.set('Não foi possível cadastrar o cliente.');
        this.saving.set(false);
      },
    });
  }
}
