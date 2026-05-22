export const SCHEDULING_EVENTS_EXCHANGE = 'pilates.events';
export const SCHEDULING_EVENTS_TOPIC_PREFIX = 'pilates.scheduling';

export const SchedulingEventRoutingKey = {
  Created: 'scheduling.created',
  Cancelled: 'scheduling.cancelled',
  Reminder: 'scheduling.reminder',
  CheckedIn: 'scheduling.checked-in',
} as const;

export const SchedulingKafkaTopic = {
  Created: `${SCHEDULING_EVENTS_TOPIC_PREFIX}.created`,
  Cancelled: `${SCHEDULING_EVENTS_TOPIC_PREFIX}.cancelled`,
  Reminder: `${SCHEDULING_EVENTS_TOPIC_PREFIX}.reminder`,
  CheckedIn: `${SCHEDULING_EVENTS_TOPIC_PREFIX}.checked-in`,
} as const;

export interface SchedulingCreatedEvent {
  schedulingId: string;
  clientEmail: string;
  professionalName: string;
  startAt: Date;
}

export interface SchedulingCancelledEvent {
  schedulingId: string;
  clientEmail: string;
  reason: string;
  startAt: Date;
}

export interface SchedulingReminderEvent {
  schedulingId: string;
  clientEmail: string;
  startAt: Date;
}

export interface SchedulingCheckedInEvent {
  schedulingId: string;
  clientName: string;
  professionalName: string;
  professionalPhone: string;
  checkedInByName: string;
  receptionPhone: string;
  startAt: Date;
}
