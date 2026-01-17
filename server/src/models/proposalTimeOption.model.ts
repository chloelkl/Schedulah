export type ProposalTimeOption = {
  slot_id: string;
  proposal_id: string;

  start_at: string;
  end_at: string;

  free_count: number;
  busy_count: number;
  score: number | null;
};
