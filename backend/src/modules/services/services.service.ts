import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateServiceQuoteDto } from './dto/create-service-quote.dto';

interface ServiceCatalogItem {
  id: string;
  name: string;
  kind: 'PLAN' | 'SESSION' | 'ASSESSMENT';
  price: number;
}

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  frequency?: string;
  duration?: string;
}

interface ServiceQuote {
  id: string;
  clientName: string;
  createdAt: Date;
  notes?: string;
  clientPhone?: string;
  clientEmail?: string;
  quoteValidity?: string;
  objective?: string;
  recommendedFrequency?: string;
  items: QuoteItem[];
  total: number;
}

@Injectable()
export class ServicesService {
  private readonly catalog: ServiceCatalogItem[] = [
    { id: randomUUID(), name: 'Mensalidade Pilates', kind: 'PLAN', price: 320 },
    { id: randomUUID(), name: 'Plano Trimestral', kind: 'PLAN', price: 900 },
    { id: randomUUID(), name: 'Plano Anual', kind: 'PLAN', price: 3200 },
    { id: randomUUID(), name: 'Pacote 10 aulas', kind: 'PLAN', price: 650 },
    { id: randomUUID(), name: 'Aula Avulsa', kind: 'SESSION', price: 90 },
    { id: randomUUID(), name: 'Avaliacao Fisioterapeutica', kind: 'ASSESSMENT', price: 180 },
  ];

  private readonly quotes = new Map<string, ServiceQuote>();

  listCatalog(search?: string) {
    const term = search?.trim().toLowerCase();
    const items = term
      ? this.catalog.filter((item) => item.name.toLowerCase().includes(term))
      : this.catalog;
    return { items };
  }

  createQuote(dto: CreateServiceQuoteDto) {
    if (!dto.items.length) {
      throw new BadRequestException('Informe ao menos um item para o orcamento.');
    }

    const quoteItems = dto.items.map((item) => {
      const catalogItem = item.serviceId
        ? this.catalog.find((catalog) => catalog.id === item.serviceId)
        : null;

      if (item.serviceId && !catalogItem) {
        throw new BadRequestException('Item de servico nao encontrado para o orcamento.');
      }

      const description = item.description?.trim() || catalogItem?.name;
      if (!description) {
        throw new BadRequestException('Descricao do item de orcamento e obrigatoria.');
      }

      const unitPrice = item.unitPrice ?? catalogItem?.price ?? 0;
      const total = Number((unitPrice * item.quantity).toFixed(2));

      return {
        description,
        quantity: item.quantity,
        unitPrice,
        total,
        frequency: item.frequency?.trim() || `${item.quantity} sessao(oes)`,
        duration: item.duration?.trim() || 'A combinar',
      };
    });

    const total = Number(
      quoteItems.reduce((sum, item) => sum + item.total, 0).toFixed(2),
    );

    const quote: ServiceQuote = {
      id: randomUUID(),
      clientName: dto.clientName,
      createdAt: new Date(),
      notes: dto.notes?.trim() || undefined,
      clientPhone: dto.clientPhone?.trim() || undefined,
      clientEmail: dto.clientEmail?.trim() || undefined,
      quoteValidity: dto.quoteValidity?.trim() || '15 dias',
      objective: dto.objective?.trim() || undefined,
      recommendedFrequency: dto.recommendedFrequency?.trim() || undefined,
      items: quoteItems,
      total,
    };

    this.quotes.set(quote.id, quote);
    return {
      ...quote,
      pdfUrl: `/services/quotes/${quote.id}/pdf`,
    };
  }

  getQuotePdf(quoteId: string): Buffer {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new NotFoundException('Orcamento nao encontrado.');
    }

    const quoteNumber = quote.id.split('-')[0].toUpperCase();
    const quoteDate = quote.createdAt.toLocaleDateString('pt-BR');
    const lines = [
      'ORCAMENTO DE SERVICOS DE PILATES',
      'LatesOS | Clinica de Pilates',
      'Endereco: [preencher] | Telefone/WhatsApp: [preencher] | E-mail: [preencher]',
      'CNPJ: [preencher] | Instagram/Site: [preencher]',
      '--------------------------------------------------------------------------------',
      'DADOS DO CLIENTE',
      `Nome: ${quote.clientName}`,
      `Telefone: ${quote.clientPhone ?? '-'}`,
      `E-mail: ${quote.clientEmail ?? '-'}`,
      `Data do Orcamento: ${quoteDate}`,
      `Validade do Orcamento: ${quote.quoteValidity ?? '15 dias'}`,
      `No do Orcamento: #${quoteNumber}`,
      '--------------------------------------------------------------------------------',
      'AVALIACAO INICIAL (OPCIONAL)',
      `Objetivo do aluno/paciente: ${quote.objective ?? '-'}`,
      `Frequencia recomendada: ${quote.recommendedFrequency ?? '-'}`,
      '--------------------------------------------------------------------------------',
      'PROPOSTA DE PLANOS / SERVICOS',
      'Descricao | Frequencia | Duracao | Valor Unitario | Valor Total',
      ...quote.items.map(
        (item) =>
          `${item.description} | ${item.frequency ?? '-'} | ${item.duration ?? '-'} | ${this.formatMoney(item.unitPrice)} | ${this.formatMoney(item.total)}`,
      ),
      `VALOR TOTAL DO ORCAMENTO: ${this.formatMoney(quote.total)}`,
      '--------------------------------------------------------------------------------',
      'CONDICOES DE PAGAMENTO',
      'Formas aceitas: PIX, cartao de credito, cartao de debito ou dinheiro.',
      'Desconto: 5% para pagamento a vista no PIX (configuravel).',
      'Vencimento: mensalidades no dia X de cada mes ou na data da contratacao.',
      '--------------------------------------------------------------------------------',
      'POLITICA DE CANCELAMENTO E REPOSICAO',
      'Faltas: cancelar com no minimo 12 horas de antecedencia.',
      'Reposicao: no mesmo mes, mediante disponibilidade de agenda.',
      'Faltas sem aviso previo nao geram reposicao.',
      '--------------------------------------------------------------------------------',
      quote.notes ? `Observacoes adicionais: ${quote.notes}` : '',
      'Aprovado por: _________________________________________________',
      'Assinatura do cliente',
      'Data: ___ / ___ / ______',
    ].filter(Boolean);

    return this.buildSimplePdf(lines);
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  private buildSimplePdf(lines: string[]): Buffer {
    const streamLines = ['BT', '/F1 11 Tf'];
    let y = 800;
    for (const line of lines) {
      const safeLine = this.escapePdfText(this.toPdfLatinText(line));
      streamLines.push(`1 0 0 1 42 ${y} Tm (${safeLine}) Tj`);
      y -= 18;
      if (y < 60) break;
    }
    streamLines.push('ET');
    const stream = `${streamLines.join('\n')}\n`;

    const objects: string[] = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
      `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'latin1'));
      pdf += object;
    }

    const xrefStart = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, 'latin1');
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private toPdfLatinText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '?');
  }
}
