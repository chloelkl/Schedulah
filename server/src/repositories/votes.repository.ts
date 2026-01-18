// server/src/repositories/votes.repository.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type TimeVoteValue = "free" | "busy" | "unavailable"; // add 'unsure' later

export class VotesRepository {
  constructor(private supabase: SupabaseClient) {}

  async upsertTimeVote(slotId: string, userId: string, vote: TimeVoteValue) {
    const { error } = await this.supabase.from("proposal_time_votes").upsert(
      {
        slot_id: slotId,
        user_id: userId,
        vote,
        voted_at: new Date().toISOString(),
      },
      { onConflict: "slot_id,user_id" }
    );
    if (error) throw error;
  }

  async upsertActivityVote(activityId: string, userId: string, voteValue: boolean) {
    const { error } = await this.supabase.from("proposal_activity_votes").upsert(
      {
        activity_id: activityId,
        user_id: userId,
        vote_value: voteValue,
        voted_at: new Date().toISOString(),
      },
      { onConflict: "activity_id,user_id" }
    );
    if (error) throw error;
  }

  async upsertExperienceVote(experienceId: string, userId: string, voteValue: boolean) {
    const { error } = await this.supabase.from("proposal_experience_votes").upsert(
      {
        experience_id: experienceId,
        user_id: userId,
        vote_value: voteValue,
        voted_at: new Date().toISOString(),
      },
      { onConflict: "experience_id,user_id" }
    );
    if (error) throw error;
  }

  async setMemberStatus(proposalId: string, userId: string, status: "submitted" | "declined") {
    const { error } = await this.supabase.from("hangout_members").upsert(
      {
        proposal_id: proposalId,
        user_id: userId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "proposal_id,user_id" }
    );
    if (error) throw error;
  }
}
