export const SCHEDULING_EVENTS_EXCHANGE = 'pilates.events';
export const SCHEDULING_EVENTS_TOPIC_PREFIX = 'pilates.scheduling';

export const SchedulingEventRoutingKey = {
  Created: 'scheduling.created',
  Cancelled: 'scheduling.cancelled',
  Reminder: 'scheduling.reminder',
} as const;

export const SchedulingKafkaTopic = {
  Created: `${SCHEDULING_EVENTS_TOPIC_PREFIX}.created`,
  Cancelled: `${SCHEDULING_EVENTS_TOPIC_PREFIX}.cancelled`,
  Reminder: `${SCHEDULING_EVENTS_TOPIC_PREFIX}.reminder`,
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
