export type Event = {
  event_id: string;
  user_id: string;

  title: string;
  description: string | null;
  location: string | null;

  date: string;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;

  visibility: "private" | "free_busy_only";
  busy_status: "busy" | "free" | "maybe";
  source: "manual" | "group_event";

  final_event_id: string | null;

  created_at: string;
  updated_at: string;
};
