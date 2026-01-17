export type HangoutProposal = {
  proposal_id: string;
  group_id: string;
  host_user_id: string;

  title: string;
  date_start: string;
  date_end: string;
  duration_minutes: number;

  status: "draft" | "voting" | "finalized" | "cancelled";
  created_at: string;
};
