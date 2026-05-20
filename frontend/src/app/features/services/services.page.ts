import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/http/api.service';
import { ServiceCatalogItem, ServiceQuote } from '../../core/models/domain.models';

interface DraftQuoteItem {
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h2>Servicos</h2>
          <p>Tabela de valores e emissao de orcamento em PDF.</p>
        </div>
        <button class="secondary-button" type="button" (click)="loadCatalog()">Atualizar</button>
      </header>

      <section class="panel">
        <h3>Catalogo de servicos e planos</h3>
        <table class="table">
          <thead><tr><th>Servico</th><th>Tipo</th><th>Valor</th></tr></thead>
          <tbody>
            @for (item of catalog(); track item.id) {
              <tr>
                <td>{{ item.name }}</td>
                <td>{{ kindLabel(item.kind) }}</td>
                <td>{{ formatCurrency(item.price) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="muted">Sem servicos cadastrados.</td></tr>
            }
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>Novo orcamento</h3>
        <form class="grid cols-3" [formGroup]="itemForm" (ngSubmit)="addItem()">
          <label class="field">
            <span>Servico</span>
            <select formControlName="serviceId">
              <option value="">Selecione</option>
              @for (item of catalog(); track item.id) {
                <option [value]="item.id">{{ item.name }} - {{ formatCurrency(item.price) }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Quantidade</span>
            <input type="number" min="1" formControlName="quantity" />
          </label>
          <div class="field">
            <span>&nbsp;</span>
            <button class="secondary-button" type="submit" [disabled]="itemForm.invalid">Adicionar item</button>
          </div>
        </form>

        <form class="grid cols-3" [formGroup]="quoteForm" (ngSubmit)="createQuote()">
          <label class="field">
            <span>Cliente</span>
            <input formControlName="clientName" placeholder="Nome do cliente" />
          </label>
          <label class="field">
            <span>Observacoes</span>
            <input formControlName="notes" />
          </label>
          <div class="field">
            <span>&nbsp;</span>
            <button class="primary-button" type="submit" [disabled]="quoteForm.invalid || items().length === 0 || saving()">
              Gerar orcamento PDF
            </button>
          </div>
        </form>

        <table class="table">
          <thead><tr><th>Descricao</th><th>Qtd</th><th>Unitario</th><th>Total</th><th>Acao</th></tr></thead>
          <tbody>
            @for (item of items(); track $index) {
              <tr>
                <td>{{ item.description }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ formatCurrency(item.unitPrice) }}</td>
                <td>{{ formatCurrency(item.total) }}</td>
                <td><button class="danger-button" type="button" (click)="removeItem($index)">Remover</button></td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">Nenhum item no orcamento.</td></tr>
            }
          </tbody>
        </table>
      </section>

      @if (lastQuote()) {
        <section class="panel">
          <h3>Orcamento gerado</h3>
          <p><strong>ID:</strong> {{ lastQuote()?.id }}</p>
          <p><strong>Total:</strong> {{ formatCurrency(lastQuote()?.total ?? 0) }}</p>
          <button class="primary-button" type="button" (click)="openQuotePdf()">Abrir PDF</button>
        </section>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesPage {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  protected readonly catalog = signal<ServiceCatalogItem[]>([]);
  protected readonly items = signal<DraftQuoteItem[]>([]);
  protected readonly lastQuote = signal<ServiceQuote | null>(null);
  protected readonly saving = signal(false);

  protected readonly itemForm = this.fb.nonNullable.group({
    serviceId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  protected readonly quoteForm = this.fb.nonNullable.group({
    clientName: ['', [Validators.required, Validators.minLength(2)]],
    notes: [''],
  });

  constructor() {
    this.loadCatalog();
  }

  protected loadCatalog(): void {
    this.api.get<{ items: ServiceCatalogItem[] }>('/services/catalog').subscribe((result) => this.catalog.set(result.items));
  }

  protected addItem(): void {
    if (this.itemForm.invalid) return;

    const value = this.itemForm.getRawValue();
    const selected = this.catalog().find((item) => item.id === value.serviceId);
    if (!selected) return;

    const quantity = Number(value.quantity);
    const total = Number((selected.price * quantity).toFixed(2));

    this.items.update((items) => [
      ...items,
      {
        serviceId: selected.id,
        description: selected.name,
        quantity,
        unitPrice: selected.price,
        total,
      },
    ]);

    this.itemForm.patchValue({ quantity: 1 });
  }

  protected removeItem(index: number): void {
    this.items.update((items) => items.filter((_, currentIndex) => currentIndex !== index));
  }

  protected createQuote(): void {
    if (this.quoteForm.invalid || this.items().length === 0) return;

    const value = this.quoteForm.getRawValue();
    this.saving.set(true);

    this.api
      .post<ServiceQuote>('/services/quotes', {
        clientName: value.clientName,
        notes: value.notes || undefined,
        items: this.items().map((item) => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
      .subscribe({
        next: (quote) => {
          this.lastQuote.set(quote);
          this.items.set([]);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
  }

  protected openQuotePdf(): void {
    const quote = this.lastQuote();
    if (!quote) return;

    this.http
      .get(`http://localhost:3000${quote.pdfUrl}`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
      });
  }

  protected kindLabel(kind: ServiceCatalogItem['kind']): string {
    if (kind === 'PLAN') return 'Plano';
    if (kind === 'ASSESSMENT') return 'Avaliacao';
    return 'Sessao';
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  }
}
