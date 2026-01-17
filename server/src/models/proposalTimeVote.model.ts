export type ProposalTimeVote = {
  slot_id: string;
  user_id: string;
  vote: "yes" | "no" | "maybe";
  voted_at: string;
};
