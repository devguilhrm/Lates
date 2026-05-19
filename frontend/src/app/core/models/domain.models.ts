export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'PROFESSIONAL' | 'CLIENT';
export type PlanType = 'MONTHLY' | 'QUARTERLY' | 'CREDIT_PACK';
export type SchedulingStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

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
  startAt: string;
  endAt: string;
  status: SchedulingStatus;
  notes?: string | null;
  cancellationReason?: string | null;
}

export interface TimeSlot {
  startAt: string;
  endAt: string;
}
