export type HangoutProposal = {
  proposal_id: string;
  group_id: string;
  host_user_id: string;

  title: string;
  date_start: string;
  date_end: string;
  duration_minutes: number;

  voting_type: "time_only" | "time_activity" | "time_event"; // ✅ add
  activity_hint: string | null; // ✅ add (time_only only)
  location_hint: string | null; // ✅ add (time_only only)

  status: "draft" | "voting" | "finalized" | "cancelled";
  created_at: string;
};
