export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'PROFESSIONAL' | 'CLIENT';
export type PlanType = 'MONTHLY' | 'ANNUAL' | 'QUARTERLY' | 'CREDIT_PACK';
export type SchedulingStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type CancellationType = 'CLIENT_CANCELLED' | 'PROFESSIONAL_CANCELLED' | 'NO_SHOW';
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type FinancialTransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO' | 'HIPERCARD' | 'AMEX';
export type SubscriptionBillingStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'NOT_APPLICABLE';
export type SubscriptionBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

export interface Client {
  id: string;
  user: User;
  birthDate?: string | null;
  anamnesis?: string | null;
  emergencyContact?: string | null;
  plan: PlanType;
  creditsRemaining: number;
  subscriptionStatus?: SubscriptionBillingStatus;
  isUpToDate?: boolean;
  subscriptionCycle?: SubscriptionBillingCycle;
  subscriptionDueDate?: string | null;
}

export interface Professional {
  id: string;
  user: User;
  specialty: string;
  bio?: string | null;
  availabilities?: Availability[];
}

export interface Availability {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  maxConcurrentClients: number;
}

export interface Scheduling {
  id: string;
  client: Client;
  professional: Professional;
  createdBy?: User | null;
  startAt: string;
  endAt: string;
  status: SchedulingStatus;
  notes?: string | null;
  cancellationReason?: string | null;
  cancellationType?: CancellationType | null;
}

export interface TimeSlot {
  startAt: string;
  endAt: string;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  type: FinancialTransactionType;
  paymentMethod: PaymentMethod;
  cardBrand?: CardBrand | null;
  installments?: number | null;
  category?: string | null;
  creditQuantity?: number | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  client?: Client | null;
}

export interface FinanceDashboard {
  cashflow: {
    income: number;
    expense: number;
    balance: number;
    entries: number;
  };
  schedulings: {
    total: number;
    completed: number;
    cancelled: number;
    completionRate: number;
    cancellationRate: number;
  };
  monthlyFlow: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
}

export interface SubscriptionBillingItem {
  clientId: string;
  clientName: string;
  clientEmail: string;
  plan: PlanType;
  creditsRemaining: number;
  cycle: SubscriptionBillingCycle;
  status: SubscriptionBillingStatus;
  isUpToDate: boolean;
  dueDate?: string | null;
  amount?: number | null;
  lastPaymentAt?: string | null;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  kind: 'PLAN' | 'SESSION' | 'ASSESSMENT';
  price: number;
}

export interface ServiceQuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ServiceQuote {
  id: string;
  clientName: string;
  createdAt: string;
  notes?: string;
  items: ServiceQuoteItem[];
  total: number;
  pdfUrl: string;
}
