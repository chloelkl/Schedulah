export type EventRecurrence = {
  event_id: string;
  rrule: string;
  until_at: string | null;
  count: number | null;
};
