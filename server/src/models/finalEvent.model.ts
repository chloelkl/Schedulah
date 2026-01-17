export type FinalEvent = {
  final_event_id: string;
  proposal_id: string;

  chosen_slot_id: string | null;
  chosen_activity_id: string | null;

  location: string | null;
  notes: string | null;

  final_status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};
