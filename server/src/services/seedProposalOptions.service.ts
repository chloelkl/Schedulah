// server/src/services/seedProposalOptions.service.ts
import { supabase } from "../config/db.js";

type SeedMode = "activity" | "experience";

export async function seedRandom5ForProposal(params: {
  proposalId: string;
  createdBy: string; // host user id
  mode: SeedMode;
}) {
  const { proposalId, createdBy, mode } = params;

  if (mode === "activity") {
    const { error } = await supabase.rpc("seed_random_activity_options", {
      p_proposal_id: proposalId,
      p_created_by: createdBy,
      p_limit: 5,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.rpc("seed_random_experience_options", {
    p_proposal_id: proposalId,
    p_limit: 5,
  });
  if (error) throw new Error(error.message);
}
