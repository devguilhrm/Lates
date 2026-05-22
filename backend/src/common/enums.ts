export enum UserRole {
  ADMIN = 'ADMIN',
  RECEPTIONIST = 'RECEPTIONIST',
  PROFESSIONAL = 'PROFESSIONAL',
  CLIENT = 'CLIENT',
}

export enum PlanType {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
  QUARTERLY = 'QUARTERLY',
  CREDIT_PACK = 'CREDIT_PACK',
}

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

export enum SchedulingStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum FinancialTransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum PaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
}

export enum PaymentChannel {
  APP_QR = 'APP_QR',
  STORE_TERMINAL = 'STORE_TERMINAL',
}

export enum CardBrand {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  ELO = 'ELO',
  HIPERCARD = 'HIPERCARD',
  AMEX = 'AMEX',
}

export enum SubscriptionBillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

export enum SubscriptionBillingStatus {
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
}

export enum CancellationType {
  CLIENT_CANCELLED = 'CLIENT_CANCELLED',
  PROFESSIONAL_CANCELLED = 'PROFESSIONAL_CANCELLED',
  NO_SHOW = 'NO_SHOW',
}
