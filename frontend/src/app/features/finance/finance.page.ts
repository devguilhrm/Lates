import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import {
  CardBrand,
  Client,
  FinanceDashboard,
  FinancialTransaction,
  FinancialTransactionType,
  PaymentMethod,
  SubscriptionBillingItem,
} from '../../core/models/domain.models';

interface BillingPreset {
  id: string;
  label: string;
  category: string;
  defaultAmount: number;
  type: FinancialTransactionType;
  description: string;
}

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
}

interface CardBrandOption {
  value: CardBrand;
  label: string;
}

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Financeiro</h2>
          <p>Controle de entradas, saidas e relacionamento com mensalidades e planos.</p>
        </div>
        <button class="secondary-button" type="button" (click)="applyFilters()">Atualizar</button>
      </header>

      <form class="panel toolbar" [formGroup]="periodForm" (ngSubmit)="applyFilters()">
        <label class="field">
          <span>Inicio</span>
          <input type="date" formControlName="startDate" />
        </label>
        <label class="field">
          <span>Fim</span>
          <input type="date" formControlName="endDate" />
        </label>
        <button class="primary-button" type="submit">Aplicar periodo</button>
      </form>

      <div class="grid cols-3">
        <article class="panel metric">
          <span class="muted">Total de entradas</span>
          <strong class="positive">{{ formatCurrency(dashboard()?.cashflow?.income ?? 0) }}</strong>
        </article>
        <article class="panel metric">
          <span class="muted">Total de saidas</span>
          <strong class="negative">{{ formatCurrency(dashboard()?.cashflow?.expense ?? 0) }}</strong>
        </article>
        <article class="panel metric">
          <span class="muted">Saldo</span>
          <strong>{{ formatCurrency(dashboard()?.cashflow?.balance ?? 0) }}</strong>
        </article>
      </div>

      <section class="panel">
        <div class="toolbar list-header">
          <h3>Mensalidades e planos recorrentes</h3>
          <button class="secondary-button" type="button" (click)="loadSubscriptions()">Atualizar status</button>
        </div>

        @if (subscriptionError()) {
          <p class="error">{{ subscriptionError() }}</p>
        }

        <div class="toolbar filters-row">
          <label class="field compact-field">
            <span>Buscar cliente</span>
            <input [value]="subscriptionSearch()" (input)="onSubscriptionSearch($any($event.target).value)" placeholder="Nome ou email" />
          </label>
          <label class="field compact-field">
            <span>Status</span>
            <select [value]="subscriptionStatusFilter()" (change)="onSubscriptionStatusFilter($any($event.target).value)">
              <option value="">Todos</option>
              <option value="PAID">Em dia</option>
              <option value="PENDING">Pendente</option>
              <option value="OVERDUE">Atrasado</option>
            </select>
          </label>
        </div>

        <table class="table">
          <thead>
            <tr><th>Cliente</th><th>Plano</th><th>Creditos</th><th>Vencimento</th><th>Status</th><th>Ultimo pagamento</th><th>Acao</th></tr>
          </thead>
          <tbody>
            @for (item of subscriptions(); track item.clientId) {
              <tr>
                <td>{{ item.clientName }}</td>
                <td>{{ planLabel(item.plan) }}</td>
                <td>{{ item.creditsRemaining }}</td>
                <td>{{ item.dueDate ? (item.dueDate | date: 'dd/MM/yyyy') : '-' }}</td>
                <td>
                  <span class="status-chip" [class.ok]="item.status === 'PAID' || item.status === 'NOT_APPLICABLE'" [class.warn]="item.status === 'PENDING'" [class.late]="item.status === 'OVERDUE'">
                    {{ subscriptionStatusLabel(item.status) }}
                  </span>
                </td>
                <td>{{ item.lastPaymentAt ? (item.lastPaymentAt | date: 'dd/MM HH:mm') : '-' }}</td>
                <td>
                  <button
                    class="primary-button"
                    type="button"
                    [disabled]="item.status === 'PAID' || item.status === 'NOT_APPLICABLE' || saving()"
                    (click)="openSubscriptionPaymentModal(item)"
                  >
                    Dar entrada
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">Nenhum cliente encontrado para controle de mensalidade.</td></tr>
            }
          </tbody>
        </table>
      </section>

      @if (selectedSubscription()) {
        <section class="panel">
          <h3>Dar entrada em mensalidade</h3>
          <p class="muted">
            Cliente: {{ selectedSubscription()?.clientName }} |
            Plano: {{ planLabel(selectedSubscription()?.plan || 'MONTHLY') }}
          </p>
          <form class="grid cols-3" [formGroup]="subscriptionPaymentForm" (ngSubmit)="submitSubscriptionPayment()">
            <label class="field">
              <span>Descricao</span>
              <input formControlName="description" />
            </label>
            <label class="field">
              <span>Valor</span>
              <input type="number" step="0.01" min="0.01" formControlName="amount" />
            </label>
            <label class="field">
              <span>Forma de pagamento</span>
              <select formControlName="paymentMethod">
                @for (method of paymentMethodOptions; track method.value) {
                  <option [value]="method.value">{{ method.label }}</option>
                }
              </select>
            </label>

            @if (subscriptionPaymentForm.controls.paymentMethod.value === 'CREDIT_CARD') {
              <label class="field">
                <span>Bandeira</span>
                <select formControlName="cardBrand">
                  <option value="">Selecione</option>
                  @for (brand of cardBrandOptions; track brand.value) {
                    <option [value]="brand.value">{{ brand.label }}</option>
                  }
                </select>
              </label>
              <label class="field">
                <span>Parcelas</span>
                <input type="number" min="1" max="24" formControlName="installments" />
              </label>
            }

            <label class="field">
              <span>Data</span>
              <input type="datetime-local" formControlName="occurredAt" />
            </label>

            <div class="field toolbar">
              <span>&nbsp;</span>
              <button class="primary-button" type="submit" [disabled]="subscriptionPaymentForm.invalid || saving()">
                Confirmar entrada
              </button>
              <button class="secondary-button" type="button" (click)="closeSubscriptionPaymentModal()">
                Cancelar
              </button>
            </div>
          </form>
        </section>
      }

      <section class="panel">
        <h3>Entradas e saidas por mes</h3>
        <table class="table">
          <thead>
            <tr><th>Mes</th><th>Entradas</th><th>Saidas</th><th>Saldo</th></tr>
          </thead>
          <tbody>
            @for (item of dashboard()?.monthlyFlow ?? []; track item.month) {
              <tr>
                <td>{{ item.month }}</td>
                <td class="positive">{{ formatCurrency(item.income) }}</td>
                <td class="negative">{{ formatCurrency(item.expense) }}</td>
                <td>{{ formatCurrency(item.balance) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted">Sem lancamentos para o periodo.</td></tr>
            }
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>Novo lancamento</h3>
        <p class="muted">Selecione o tipo de cobranca para preencher categoria e valor base automaticamente.</p>

        <form class="grid cols-3" [formGroup]="transactionForm" (ngSubmit)="createTransaction()">
          <label class="field">
            <span>Tipo de cobranca</span>
            <select formControlName="billingPresetId">
              @for (preset of billingPresets; track preset.id) {
                <option [value]="preset.id">{{ preset.label }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Descricao</span>
            <input formControlName="description" placeholder="Ex: Mensalidade de aluno" />
          </label>
          <label class="field">
            <span>Cliente</span>
            <select formControlName="clientId">
              <option value="">Nao vincular</option>
              @for (client of clients(); track client.id) {
                <option [value]="client.id">{{ client.user.name }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Valor</span>
            <input type="number" step="0.01" min="0.01" formControlName="amount" />
          </label>
          <label class="field">
            <span>Tipo</span>
            <select formControlName="type">
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saida</option>
            </select>
          </label>
          <label class="field">
            <span>Forma de pagamento</span>
            <select formControlName="paymentMethod">
              @for (method of paymentMethodOptions; track method.value) {
                <option [value]="method.value">{{ method.label }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Categoria</span>
            <input formControlName="category" placeholder="Opcional" />
          </label>

          @if (transactionForm.controls.billingPresetId.value === 'CREDIT_PACK') {
            <label class="field">
              <span>Quantidade de creditos</span>
              <input type="number" min="1" max="500" formControlName="creditQuantity" />
            </label>
          }

          @if (transactionForm.controls.paymentMethod.value === 'CREDIT_CARD') {
            <label class="field">
              <span>Bandeira</span>
              <select formControlName="cardBrand">
                <option value="">Selecione</option>
                @for (brand of cardBrandOptions; track brand.value) {
                  <option [value]="brand.value">{{ brand.label }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Parcelas</span>
              <input type="number" min="1" max="24" formControlName="installments" />
            </label>
          }

          <label class="field">
            <span>Data</span>
            <input type="date" formControlName="occurredAt" />
          </label>

          <div class="field">
            <span>&nbsp;</span>
            <button class="primary-button" type="submit" [disabled]="transactionForm.invalid || saving()">
              Registrar
            </button>
          </div>
        </form>

        <div class="preset-chips">
          @for (preset of incomePresets(); track preset.id) {
            <button type="button" class="chip" (click)="choosePreset(preset.id)">
              {{ preset.label }} · {{ formatCurrency(preset.defaultAmount) }}
            </button>
          }
        </div>
      </section>

      <section class="panel">
        <div class="toolbar list-header">
          <h3>Lancamentos</h3>
          <label class="field compact-field">
            <span>Filtro de tipo</span>
            <select [value]="typeFilter()" (change)="onTypeFilterChange($any($event.target).value)">
              <option value="">Todos</option>
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saida</option>
            </select>
          </label>
        </div>
        <table class="table">
          <thead>
            <tr><th>Data</th><th>Descricao</th><th>Categoria</th><th>Pagamento</th><th>Tipo</th><th>Valor</th></tr>
          </thead>
          <tbody>
            @for (item of transactions(); track item.id) {
              <tr>
                <td>{{ item.occurredAt | date: 'dd/MM/yyyy' }}</td>
                <td>{{ item.description }}</td>
                <td>{{ item.category || '-' }}</td>
                <td>{{ paymentLabel(item) }}</td>
                <td>{{ item.type === 'INCOME' ? 'Entrada' : 'Saida' }}</td>
                <td [class.positive]="item.type === 'INCOME'" [class.negative]="item.type === 'EXPENSE'">
                  {{ formatCurrency(item.amount) }}
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted">Nenhum lancamento encontrado.</td></tr>
            }
          </tbody>
        </table>
      </section>

      <div class="grid cols-3">
        <article class="panel metric">
          <span class="muted">Agendamentos concluidos</span>
          <strong>{{ dashboard()?.schedulings?.completed ?? 0 }}</strong>
          <small class="muted">Taxa: {{ dashboard()?.schedulings?.completionRate ?? 0 }}%</small>
        </article>
        <article class="panel metric">
          <span class="muted">Agendamentos cancelados</span>
          <strong>{{ dashboard()?.schedulings?.cancelled ?? 0 }}</strong>
          <small class="muted">Taxa: {{ dashboard()?.schedulings?.cancellationRate ?? 0 }}%</small>
        </article>
        <article class="panel metric">
          <span class="muted">Total no periodo</span>
          <strong>{{ dashboard()?.schedulings?.total ?? 0 }}</strong>
          <small class="muted">Base para os indicadores</small>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
    h3 {
      margin: 0 0 0.8rem;
    }

    .positive {
      color: var(--accent);
    }

    .negative {
      color: var(--danger);
    }

    .list-header {
      justify-content: space-between;
      margin-bottom: 0.8rem;
      align-items: end;
    }

    .compact-field {
      min-width: 11rem;
    }

    .filters-row {
      margin-bottom: 0.8rem;
    }

    .preset-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-top: 0.85rem;
    }

    .chip {
      border: 1px solid var(--line);
      background: var(--surface-strong);
      color: var(--text);
      border-radius: 999px;
      padding: 0.45rem 0.7rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.82rem;
    }

    .chip:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .status-chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .status-chip.ok {
      color: var(--success);
      border-color: color-mix(in srgb, var(--success) 60%, var(--line));
    }

    .status-chip.warn {
      color: var(--warning);
      border-color: color-mix(in srgb, var(--warning) 60%, var(--line));
    }

    .status-chip.late {
      color: var(--danger);
      border-color: color-mix(in srgb, var(--danger) 60%, var(--line));
    }
  `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly billingPresets: BillingPreset[] = [
    {
      id: 'MONTHLY_PLAN',
      label: 'Mensalidade',
      category: 'Mensalidade',
      defaultAmount: 320,
      type: 'INCOME',
      description: 'Mensalidade do aluno',
    },
    {
      id: 'ANNUAL_PLAN',
      label: 'Plano anual',
      category: 'Plano anual',
      defaultAmount: 3200,
      type: 'INCOME',
      description: 'Pagamento de plano anual',
    },
    {
      id: 'QUARTERLY_PLAN',
      label: 'Plano trimestral',
      category: 'Plano trimestral',
      defaultAmount: 900,
      type: 'INCOME',
      description: 'Pagamento de plano trimestral',
    },
    {
      id: 'CREDIT_PACK',
      label: 'Pacote de creditos',
      category: 'Pacote de creditos',
      defaultAmount: 650,
      type: 'INCOME',
      description: 'Venda de pacote de aulas',
    },
    {
      id: 'SINGLE_CLASS',
      label: 'Aula avulsa',
      category: 'Aula avulsa',
      defaultAmount: 90,
      type: 'INCOME',
      description: 'Pagamento de aula unica',
    },
    {
      id: 'FIXED_EXPENSE',
      label: 'Custo fixo',
      category: 'Despesa fixa',
      defaultAmount: 450,
      type: 'EXPENSE',
      description: 'Despesa operacional',
    },
  ];

  protected readonly paymentMethodOptions: PaymentMethodOption[] = [
    { value: 'PIX', label: 'PIX' },
    { value: 'CREDIT_CARD', label: 'Cartao de credito' },
    { value: 'DEBIT_CARD', label: 'Cartao de debito' },
  ];

  protected readonly cardBrandOptions: CardBrandOption[] = [
    { value: 'VISA', label: 'Visa' },
    { value: 'MASTERCARD', label: 'Mastercard' },
    { value: 'ELO', label: 'Elo' },
    { value: 'HIPERCARD', label: 'Hipercard' },
    { value: 'AMEX', label: 'American Express' },
  ];

  protected readonly dashboard = signal<FinanceDashboard | null>(null);
  protected readonly clients = signal<Client[]>([]);
  protected readonly transactions = signal<FinancialTransaction[]>([]);
  protected readonly subscriptions = signal<SubscriptionBillingItem[]>([]);
  protected readonly typeFilter = signal<FinancialTransactionType | ''>('');
  protected readonly subscriptionSearch = signal('');
  protected readonly subscriptionStatusFilter = signal<'PAID' | 'PENDING' | 'OVERDUE' | ''>('');
  protected readonly saving = signal(false);
  protected readonly subscriptionError = signal('');
  protected readonly selectedSubscription = signal<SubscriptionBillingItem | null>(null);
  protected readonly incomePresets = signal<BillingPreset[]>(
    this.billingPresets.filter((preset) => preset.type === 'INCOME'),
  );

  protected readonly periodForm = this.fb.nonNullable.group({
    startDate: [this.startOfMonth()],
    endDate: [this.todayDate(), Validators.required],
  });

  protected readonly transactionForm = this.fb.nonNullable.group({
    billingPresetId: ['MONTHLY_PLAN', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(140)]],
    clientId: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['INCOME' as FinancialTransactionType, Validators.required],
    paymentMethod: ['PIX' as PaymentMethod, Validators.required],
    cardBrand: ['' as CardBrand | ''],
    installments: [1],
    category: [''],
    creditQuantity: [10],
    occurredAt: [this.todayDate(), Validators.required],
  });

  protected readonly subscriptionPaymentForm = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(140)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMethod: ['PIX' as PaymentMethod, Validators.required],
    cardBrand: ['' as CardBrand | ''],
    installments: [1],
    occurredAt: [this.todayDateTimeLocal(), Validators.required],
  });

  constructor() {
    this.transactionForm.controls.billingPresetId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((presetId) => this.applyPreset(presetId));

    this.transactionForm.controls.paymentMethod.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paymentMethod) => this.applyPaymentMethodRules(paymentMethod));

    this.subscriptionPaymentForm.controls.paymentMethod.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paymentMethod) => this.applySubscriptionPaymentMethodRules(paymentMethod));

    this.applyPreset('MONTHLY_PLAN');
    this.applyPaymentMethodRules(this.transactionForm.controls.paymentMethod.value);
    this.applySubscriptionPaymentMethodRules(this.subscriptionPaymentForm.controls.paymentMethod.value);
    this.applyFilters();
  }

  protected applyFilters(): void {
    const period = this.periodForm.getRawValue();
    this.api.get<FinanceDashboard>('/finance/dashboard', period).subscribe((result) => this.dashboard.set(result));
    this.loadClients();
    this.loadTransactions();
    this.loadSubscriptions();
  }

  protected loadSubscriptions(): void {
    this.subscriptionError.set('');
    this.api
      .getPaginated<SubscriptionBillingItem>('/finance/subscriptions', {
        limit: 100,
        search: this.subscriptionSearch() || undefined,
        status: this.subscriptionStatusFilter() || undefined,
      })
      .subscribe({
        next: (result) => this.subscriptions.set(result.items),
        error: () => {
          this.subscriptions.set([]);
          this.subscriptionError.set(
            'Nao foi possivel carregar mensalidades. Verifique permissao de acesso e parametros de filtro.',
          );
        },
      });
  }

  protected onSubscriptionSearch(value: string): void {
    this.subscriptionSearch.set(value);
    this.loadSubscriptions();
  }

  protected onSubscriptionStatusFilter(value: 'PAID' | 'PENDING' | 'OVERDUE' | ''): void {
    this.subscriptionStatusFilter.set(value);
    this.loadSubscriptions();
  }

  protected openSubscriptionPaymentModal(item: SubscriptionBillingItem): void {
    this.selectedSubscription.set(item);
    this.subscriptionPaymentForm.patchValue({
      description: `Mensalidade - ${item.clientName}`,
      amount: item.amount ?? this.defaultAmountByPlan(item.plan),
      paymentMethod: 'PIX',
      cardBrand: '',
      installments: 1,
      occurredAt: this.todayDateTimeLocal(),
    });
    this.applySubscriptionPaymentMethodRules('PIX');
  }

  protected closeSubscriptionPaymentModal(): void {
    this.selectedSubscription.set(null);
  }

  protected submitSubscriptionPayment(): void {
    const item = this.selectedSubscription();
    if (!item || this.subscriptionPaymentForm.invalid) return;

    const payload = this.subscriptionPaymentForm.getRawValue();
    this.saving.set(true);
    this.api
      .post(`/finance/subscriptions/${item.clientId}/pay`, {
        description: payload.description,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        cardBrand: payload.paymentMethod === 'CREDIT_CARD' ? payload.cardBrand : undefined,
        installments: payload.paymentMethod === 'CREDIT_CARD' ? payload.installments : undefined,
        occurredAt: this.toIsoFromLocal(payload.occurredAt),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeSubscriptionPaymentModal();
          this.applyFilters();
        },
        error: () => this.saving.set(false),
      });
  }

  protected choosePreset(presetId: string): void {
    this.transactionForm.patchValue({ billingPresetId: presetId });
  }

  protected onTypeFilterChange(value: FinancialTransactionType | ''): void {
    this.typeFilter.set(value);
    this.loadTransactions();
  }

  protected createTransaction(): void {
    if (this.transactionForm.invalid) return;

    const payload = this.transactionForm.getRawValue();

    this.saving.set(true);
    this.api
      .post<FinancialTransaction>('/finance/transactions', {
        description: payload.description,
        amount: payload.amount,
        type: payload.type,
        paymentMethod: payload.paymentMethod,
        cardBrand: payload.paymentMethod === 'CREDIT_CARD' ? payload.cardBrand : undefined,
        installments: payload.paymentMethod === 'CREDIT_CARD' ? payload.installments : undefined,
        category: payload.category,
        clientId: payload.clientId || undefined,
        creditQuantity:
          payload.billingPresetId === 'CREDIT_PACK' ? payload.creditQuantity : undefined,
        occurredAt: payload.occurredAt,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.transactionForm.patchValue({ occurredAt: this.todayDate() });
          this.applyPreset(payload.billingPresetId);
          this.applyFilters();
        },
        error: () => this.saving.set(false),
      });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  }

  protected paymentLabel(item: FinancialTransaction): string {
    if (item.paymentMethod === 'PIX') return 'PIX';
    if (item.paymentMethod === 'DEBIT_CARD') return 'Debito';

    const brand = this.cardBrandOptions.find((option) => option.value === item.cardBrand)?.label ?? 'Cartao';
    const installments = item.installments && item.installments > 1 ? ` ${item.installments}x` : '';
    return `${brand}${installments}`;
  }

  protected subscriptionStatusLabel(status: SubscriptionBillingItem['status']): string {
    if (status === 'PAID') return 'Em dia';
    if (status === 'PENDING') return 'Pendente';
    if (status === 'OVERDUE') return 'Atrasado';
    return 'Nao aplicavel';
  }

  protected planLabel(plan: SubscriptionBillingItem['plan']): string {
    if (plan === 'ANNUAL') return 'Anual';
    if (plan === 'QUARTERLY') return 'Trimestral';
    if (plan === 'CREDIT_PACK') return 'Pacote de creditos';
    return 'Mensal';
  }

  private applyPreset(presetId: string): void {
    const preset = this.billingPresets.find((item) => item.id === presetId);
    if (!preset) return;
    const clientIdControl = this.transactionForm.controls.clientId;
    const creditQuantityControl = this.transactionForm.controls.creditQuantity;

    this.transactionForm.patchValue(
      {
        type: preset.type,
        category: preset.category,
        description: preset.description,
        amount: preset.defaultAmount,
        clientId: '',
        creditQuantity: preset.id === 'CREDIT_PACK' ? 10 : 1,
        paymentMethod: 'PIX',
        cardBrand: '',
        installments: 1,
      },
      { emitEvent: false },
    );

    if (preset.id === 'CREDIT_PACK') {
      clientIdControl.setValidators([Validators.required]);
      creditQuantityControl.setValidators([Validators.required, Validators.min(1), Validators.max(500)]);
    } else {
      clientIdControl.clearValidators();
      creditQuantityControl.clearValidators();
    }

    clientIdControl.updateValueAndValidity({ emitEvent: false });
    creditQuantityControl.updateValueAndValidity({ emitEvent: false });
    this.applyPaymentMethodRules('PIX');
  }

  private applyPaymentMethodRules(paymentMethod: PaymentMethod): void {
    const cardBrandControl = this.transactionForm.controls.cardBrand;
    const installmentsControl = this.transactionForm.controls.installments;

    if (paymentMethod === 'CREDIT_CARD') {
      cardBrandControl.setValidators([Validators.required]);
      installmentsControl.setValidators([Validators.required, Validators.min(1), Validators.max(24)]);
    } else {
      cardBrandControl.clearValidators();
      installmentsControl.clearValidators();
      cardBrandControl.setValue('', { emitEvent: false });
      installmentsControl.setValue(1, { emitEvent: false });
    }

    cardBrandControl.updateValueAndValidity({ emitEvent: false });
    installmentsControl.updateValueAndValidity({ emitEvent: false });
  }

  private applySubscriptionPaymentMethodRules(paymentMethod: PaymentMethod): void {
    const cardBrandControl = this.subscriptionPaymentForm.controls.cardBrand;
    const installmentsControl = this.subscriptionPaymentForm.controls.installments;

    if (paymentMethod === 'CREDIT_CARD') {
      cardBrandControl.setValidators([Validators.required]);
      installmentsControl.setValidators([Validators.required, Validators.min(1), Validators.max(24)]);
    } else {
      cardBrandControl.clearValidators();
      installmentsControl.clearValidators();
      cardBrandControl.setValue('', { emitEvent: false });
      installmentsControl.setValue(1, { emitEvent: false });
    }

    cardBrandControl.updateValueAndValidity({ emitEvent: false });
    installmentsControl.updateValueAndValidity({ emitEvent: false });
  }

  private loadClients(): void {
    this.api.getPaginated<Client>('/clients', { limit: 100 }).subscribe((result) => this.clients.set(result.items));
  }

  private loadTransactions(): void {
    const period = this.periodForm.getRawValue();
    this.api
      .getPaginated<FinancialTransaction>('/finance/transactions', {
        limit: 100,
        startDate: period.startDate,
        endDate: period.endDate,
        type: this.typeFilter() || undefined,
      })
      .subscribe((result) => this.transactions.set(result.items));
  }

  private todayDate(): string {
    return this.toDateInput(new Date());
  }

  private todayDateTimeLocal(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    const hh = `${now.getHours()}`.padStart(2, '0');
    const min = `${now.getMinutes()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  private startOfMonth(): string {
    const now = new Date();
    return this.toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  private toDateInput(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private defaultAmountByPlan(plan: SubscriptionBillingItem['plan']): number {
    if (plan === 'ANNUAL') return 3200;
    if (plan === 'QUARTERLY') return 900;
    return 320;
  }

  private toIsoFromLocal(local: string): string {
    const date = new Date(local);
    return date.toISOString();
  }
}
