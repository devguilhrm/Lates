import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import {
  CardBrand,
  Client,
  MySubscriptionBilling,
  PaymentChannel,
  PaymentMethod,
  Professional,
  Scheduling,
  TimeSlot,
} from '../../core/models/domain.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  standalone: true,
  imports: [DatePipe, CurrencyPipe, ReactiveFormsModule, StatusBadgeComponent],
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

      @if (hasPendingBilling()) {
        <section class="panel">
          <h3>Pagamento de mensalidade no app</h3>
          <p class="muted">
            Escolha se deseja pagar no app (QR) ou gerar um codigo para a maquininha da loja.
          </p>
          <form class="grid cols-3" [formGroup]="paymentForm">
            <label class="field">
              <span>Mensalidade</span>
              <select formControlName="billingId">
                @for (billing of pendingBillings(); track billing.billingId) {
                  <option [value]="billing.billingId">
                    {{ billing.referencePeriod }} - {{ billing.amount | currency: 'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </option>
                }
              </select>
            </label>
            <label class="field">
              <span>Forma de pagamento</span>
              <select formControlName="paymentMethod">
                <option value="PIX">Pix</option>
                <option value="CREDIT_CARD">Cartao de credito</option>
                <option value="DEBIT_CARD">Cartao de debito</option>
              </select>
            </label>
            <label class="field">
              <span>Canal</span>
              <select formControlName="paymentChannel">
                <option value="APP_QR">Gerar codigo na tela</option>
                <option value="STORE_TERMINAL">Gerar codigo para maquininha</option>
              </select>
            </label>

            @if (paymentForm.controls.paymentMethod.value === 'CREDIT_CARD') {
              <label class="field">
                <span>Bandeira</span>
                <select formControlName="cardBrand">
                  <option value="">Selecione</option>
                  <option value="VISA">Visa</option>
                  <option value="MASTERCARD">Mastercard</option>
                  <option value="ELO">Elo</option>
                  <option value="HIPERCARD">Hipercard</option>
                  <option value="AMEX">American Express</option>
                </select>
              </label>
              <label class="field">
                <span>Parcelas</span>
                <input type="number" min="1" max="24" formControlName="installments" />
              </label>
            }

            <label class="field">
              <span>Valor</span>
              <input type="number" min="0.01" step="0.01" formControlName="amount" />
            </label>
            <label class="field">
              <span>Data</span>
              <input type="datetime-local" formControlName="occurredAt" />
            </label>
            <div class="field toolbar">
              <span>&nbsp;</span>
              <button class="secondary-button" type="button" (click)="generatePaymentCode()" [disabled]="paymentForm.invalid">
                Gerar codigo
              </button>
              <button class="primary-button" type="button" (click)="confirmPayment()" [disabled]="paymentForm.invalid || paying()">
                {{ paying() ? 'Processando...' : 'Confirmar pagamento' }}
              </button>
            </div>
          </form>

          @if (paymentPreview()) {
            <article class="panel payment-preview">
              <strong>Codigo gerado</strong>
              <p class="muted">Codigo: {{ paymentPreview()?.paymentCode }}</p>
              @if (paymentPreview()?.qrCodePayload) {
                <p class="muted">QR payload (copia e cola Pix): {{ paymentPreview()?.qrCodePayload }}</p>
              }
              <p class="muted">Expira em: {{ paymentPreview()?.expiresAt | date: 'dd/MM HH:mm' }}</p>
            </article>
          }
        </section>
      }

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

    .payment-preview {
      margin-top: 0.75rem;
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
  protected readonly paying = signal(false);
  protected readonly myBillings = signal<MySubscriptionBilling[]>([]);
  protected readonly paymentPreview = signal<{
    paymentCode: string;
    qrCodePayload: string | null;
    expiresAt: string;
  } | null>(null);

  protected readonly slotForm = this.fb.nonNullable.group({
    professionalId: ['', Validators.required],
    date: [this.todayDate(), Validators.required],
    duration: [60, Validators.required],
  });
  protected readonly paymentForm = this.fb.nonNullable.group({
    billingId: ['', Validators.required],
    paymentMethod: ['PIX' as PaymentMethod, Validators.required],
    paymentChannel: ['APP_QR' as PaymentChannel, Validators.required],
    cardBrand: ['' as CardBrand | ''],
    installments: [1],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    occurredAt: [this.todayDateTimeLocal(), Validators.required],
  });

  protected readonly canBook = computed(() => !!this.selectedSlot() && !!this.me());
  protected readonly pendingBillings = computed(() =>
    this.myBillings().filter((item) => item.status !== 'PAID'),
  );
  protected readonly hasPendingBilling = computed(() => this.pendingBillings().length > 0);

  constructor() {
    this.paymentForm.controls.paymentMethod.valueChanges.subscribe((method) =>
      this.applyPaymentMethodRules(method),
    );
    this.applyPaymentMethodRules(this.paymentForm.controls.paymentMethod.value);
    this.loadInitialData();
  }

  protected loadInitialData(): void {
    this.api.get<Client>('/clients/me').subscribe((client) => this.me.set(client));
    this.api
      .getPaginated<Professional>('/professionals', { limit: 100 })
      .subscribe((result) => this.professionals.set(result.items));
    this.api.get<{ items: MySubscriptionBilling[] }>('/finance/my/subscriptions').subscribe((result) => {
      this.myBillings.set(result.items);
      const firstPending = result.items.find((item) => item.status !== 'PAID');
      if (firstPending) {
        this.paymentForm.patchValue({
          billingId: firstPending.billingId,
          amount: firstPending.amount,
          occurredAt: this.todayDateTimeLocal(),
        });
      }
    });
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

  protected generatePaymentCode(): void {
    if (this.paymentForm.invalid) return;
    const form = this.paymentForm.getRawValue();
    this.api
      .post<{
        payment: { paymentCode: string; qrCodePayload: string | null; expiresAt: string };
      }>(`/finance/my/subscriptions/${form.billingId}/payment-code`, {
        paymentMethod: form.paymentMethod,
        paymentChannel: form.paymentChannel,
      })
      .subscribe((result) => this.paymentPreview.set(result.payment));
  }

  protected confirmPayment(): void {
    if (this.paymentForm.invalid) return;
    const form = this.paymentForm.getRawValue();

    this.paying.set(true);
    this.api
      .post(`/finance/my/subscriptions/${form.billingId}/pay`, {
        paymentMethod: form.paymentMethod,
        paymentChannel: form.paymentChannel,
        cardBrand: form.paymentMethod === 'CREDIT_CARD' ? form.cardBrand : undefined,
        installments: form.paymentMethod === 'CREDIT_CARD' ? form.installments : undefined,
        amount: form.amount,
        occurredAt: this.toIsoFromLocal(form.occurredAt),
      })
      .subscribe({
        next: () => {
          this.paying.set(false);
          this.paymentPreview.set(null);
          this.loadInitialData();
        },
        error: () => this.paying.set(false),
      });
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

  private todayDateTimeLocal(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    const hh = `${now.getHours()}`.padStart(2, '0');
    const min = `${now.getMinutes()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  private applyPaymentMethodRules(method: PaymentMethod): void {
    const cardBrandControl = this.paymentForm.controls.cardBrand;
    const installmentsControl = this.paymentForm.controls.installments;

    if (method === 'CREDIT_CARD') {
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

  private toIsoFromLocal(local: string): string {
    return new Date(local).toISOString();
  }

  private loadMySchedulings(): void {
    this.api
      .getPaginated<Scheduling>('/schedulings', { limit: 50 })
      .subscribe((result) => this.mySchedulings.set(result.items));
  }
}
