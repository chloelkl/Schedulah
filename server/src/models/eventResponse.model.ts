export type EventResponse = {
  final_event_id: string;
  user_id: string;

  response: "accepted" | "declined" | "pending";
  responded_at: string | null;
};
