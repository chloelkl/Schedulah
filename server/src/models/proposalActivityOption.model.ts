export type ProposalActivityOption = {
  activity_id: string;
  proposal_id: string;

  title: string;
  details: string | null;

  source_type: "catalog" | "custom";
  recommendation_id: string | null;

  created_by: string;
  created_at: string;
};
