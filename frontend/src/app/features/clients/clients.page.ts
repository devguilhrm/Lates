import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/http/api.service';
import { Client, PlanType } from '../../core/models/domain.models';

interface PlanOption {
  value: PlanType;
  label: string;
  defaultCredits: number;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Clientes</h2>
          <p>Cadastro, creditos de aulas, busca por nome e manutencao de registros.</p>
        </div>
        <button class="secondary-button" type="button" (click)="load()">Atualizar</button>
      </header>

      <form class="panel grid cols-3" [formGroup]="form" (ngSubmit)="save()">
        <label class="field"><span>Nome</span><input formControlName="name" /></label>
        <label class="field"><span>E-mail</span><input type="email" formControlName="email" /></label>
        <label class="field"><span>Senha inicial</span><input type="password" formControlName="password" /></label>
        <label class="field"><span>Telefone</span><input formControlName="phone" /></label>
        <label class="field">
          <span>Plano</span>
          <select formControlName="plan">
            @for (plan of plans; track plan.value) {
              <option [value]="plan.value">{{ plan.label }}</option>
            }
          </select>
        </label>
        <label class="field"><span>Creditos disponiveis</span><input type="number" formControlName="creditsRemaining" /></label>
        <label class="field"><span>Contato de emergencia (opcional)</span><input formControlName="emergencyContact" /></label>
        <label class="field">
          <span>Anamnese (opcoes)</span>
          <select [value]="selectedAnamnesisPreset()" (change)="onAnamnesisPreset($any($event.target).value)">
            <option value="">Selecione</option>
            @for (item of anamnesisPresets; track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>
        <label class="field"><span>Anamnese detalhada</span><textarea formControlName="anamnesis"></textarea></label>
        <div class="field">
          <span>&nbsp;</span>
          <button class="primary-button" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Salvando...' : (editingClientId() ? 'Atualizar cliente' : 'Cadastrar cliente') }}
          </button>
        </div>
        @if (editingClientId()) {
          <div class="field">
            <span>&nbsp;</span>
            <button class="secondary-button" type="button" (click)="cancelEdit()">Cancelar edicao</button>
          </div>
        }
      </form>

      <section class="panel toolbar">
        <label class="field search-field">
          <span>Buscar por nome</span>
          <input [value]="search()" (input)="onSearch($any($event.target).value)" placeholder="Digite o nome do cliente" />
        </label>
        <label class="field">
          <span>Adimplencia</span>
          <select [value]="billingFilter()" (change)="onBillingFilter($any($event.target).value)">
            <option value="ALL">Todos</option>
            <option value="NOT_UP_TO_DATE">Nao em dia</option>
            <option value="UP_TO_DATE">Em dia</option>
          </select>
        </label>
      </section>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="panel">
        <table class="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Plano</th><th>Creditos</th><th>Mensalidade</th><th>Status</th><th>Acoes</th></tr>
          </thead>
          <tbody>
            @for (client of clients(); track client.id) {
              <tr>
                <td>{{ client.user.name }}</td>
                <td>{{ client.user.email }}</td>
                <td>{{ planLabel(client.plan) }}</td>
                <td>{{ client.creditsRemaining }}</td>
                <td>{{ billingLabel(client) }}</td>
                <td>{{ client.user.isActive ? 'Ativo' : 'Inativo' }}</td>
                <td class="toolbar">
                  <button class="secondary-button" type="button" (click)="edit(client)">Editar</button>
                  <button class="danger-button" type="button" (click)="remove(client)">Excluir</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">Nenhum cliente encontrado.</td></tr>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly plans: PlanOption[] = [
    { value: 'MONTHLY', label: 'Mensal', defaultCredits: 12 },
    { value: 'ANNUAL', label: 'Anual', defaultCredits: 144 },
    { value: 'QUARTERLY', label: 'Trimestral', defaultCredits: 36 },
    { value: 'CREDIT_PACK', label: 'Pacote de creditos', defaultCredits: 10 },
  ];

  protected readonly anamnesisPresets = [
    'Dor lombar',
    'Pos-operatorio',
    'Hipertensao',
    'Gestante',
    'Reabilitacao geral',
    'Hernia de disco',
    'Cervicalgia',
    'Escoliose',
    'Fibromialgia',
    'Sedentarismo',
    'Recuperacao pos-parto',
    'Dor no ombro',
    'Fortalecimento de core',
    'Treino para idosos',
    'Reeducacao respiratoria',
  ];

  protected readonly clients = signal<Client[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly editingClientId = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly billingFilter = signal<'ALL' | 'NOT_UP_TO_DATE' | 'UP_TO_DATE'>('ALL');
  protected readonly selectedAnamnesisPreset = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['cliente123', [Validators.minLength(6)]],
    phone: [''],
    plan: ['MONTHLY' as PlanType, Validators.required],
    creditsRemaining: [12, [Validators.required, Validators.min(0)]],
    emergencyContact: [''],
    anamnesis: [''],
  });

  constructor() {
    this.form.controls.plan.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((plan) => {
      if (!plan) return;
      if (!this.editingClientId()) {
        this.form.patchValue({ creditsRemaining: this.defaultCredits(plan) }, { emitEvent: false });
      }
    });

    this.load();
  }

  protected onBillingFilter(value: 'ALL' | 'NOT_UP_TO_DATE' | 'UP_TO_DATE'): void {
    this.billingFilter.set(value);
    this.load();
  }

  protected billingLabel(client: Client): string {
    if (client.subscriptionStatus === 'PAID' || client.subscriptionStatus === 'NOT_APPLICABLE') {
      return 'Em dia';
    }
    if (client.subscriptionStatus === 'OVERDUE') return 'Atrasado';
    if (client.subscriptionStatus === 'PENDING') return 'Pendente';
    return '-';
  }

  protected load(): void {
    this.api
      .getPaginated<Client>('/clients', {
        limit: 100,
        search: this.search() || undefined,
        onlyNotUpToDate: this.billingFilter() === 'NOT_UP_TO_DATE' ? true : undefined,
      })
      .subscribe({
        next: (result) => {
          const items = this.billingFilter() === 'UP_TO_DATE'
            ? result.items.filter((client) => client.isUpToDate !== false)
            : result.items;
          this.clients.set(items);
        },
        error: () => this.error.set('Nao foi possivel carregar clientes.'),
      });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.load();
  }

  protected onAnamnesisPreset(value: string): void {
    this.selectedAnamnesisPreset.set(value);
    if (!value) return;
    const current = this.form.controls.anamnesis.value?.trim();
    const nextValue = current ? `${current}\n- ${value}` : `- ${value}`;
    this.form.patchValue({ anamnesis: nextValue });
  }

  protected save(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set('');

    const payload = this.form.getRawValue();
    const editingId = this.editingClientId();

    const request = editingId
      ? this.api.patch<Client>(`/clients/${editingId}`, {
          ...payload,
          password: payload.password?.trim() ? payload.password : undefined,
        })
      : this.api.post<Client>('/clients', {
          ...payload,
          password: payload.password?.trim() || 'cliente123',
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.load();
      },
      error: () => {
        this.error.set('Nao foi possivel salvar o cliente.');
        this.saving.set(false);
      },
    });
  }

  protected edit(client: Client): void {
    this.editingClientId.set(client.id);
    this.form.reset({
      name: client.user.name,
      email: client.user.email,
      password: '',
      phone: client.user.phone ?? '',
      plan: client.plan,
      creditsRemaining: client.creditsRemaining,
      emergencyContact: client.emergencyContact ?? '',
      anamnesis: client.anamnesis ?? '',
    });
  }

  protected cancelEdit(): void {
    this.editingClientId.set(null);
    this.selectedAnamnesisPreset.set('');
    this.form.reset({
      name: '',
      email: '',
      password: 'cliente123',
      phone: '',
      plan: 'MONTHLY',
      creditsRemaining: 12,
      emergencyContact: '',
      anamnesis: '',
    });
  }

  protected remove(client: Client): void {
    const shouldDelete = confirm(`Excluir cliente ${client.user.name}?`);
    if (!shouldDelete) return;

    this.api.delete(`/clients/${client.id}`).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Nao foi possivel excluir o cliente.'),
    });
  }

  protected planLabel(plan: PlanType): string {
    return this.plans.find((item) => item.value === plan)?.label ?? plan;
  }

  private defaultCredits(plan: PlanType): number {
    return this.plans.find((item) => item.value === plan)?.defaultCredits ?? 0;
  }
}
