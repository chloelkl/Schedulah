// server/src/repositories/hangouts.repository.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type HangoutProposalRow = {
  proposal_id: string;
  group_id: string;
  host_user_id: string;
  title: string;
  date_start: string;
  date_end: string;
  duration_minutes: number | null;
  status: string;
  created_at: string;
  voting_type: string;
  activity_hint: string | null;
  location_hint: string | null;
  is_anonymous?: boolean;
  locked_at?: string | null;
};

export type ProposalTimeOptionRow = {
  slot_id: string;
  proposal_id: string;
  start_at: string;
  end_at: string;
  free_count: number;
  busy_count: number;
  score: number | null;
};

export type ProposalActivityOptionRow = {
  activity_id: string;
  proposal_id: string;
  title: string;
  details: string | null;
  created_by: string;
  created_at: string;
  recommendation_id: string | null;
  source_type: string;
};

export type ProposalExperienceOptionRow = {
  experience_id: string;
  proposal_id: string;
  title: string;
  created_at: string;
};

export type FinalEventRow = {
  final_event_id: string;
  proposal_id: string | null;
  chosen_slot_id: string | null;
  chosen_activity_id: string | null; // you currently reuse this for experience too
  location: string | null;
  notes: string | null;
  final_status: string;
  created_at: string;
};

export type EventResponseRow = {
  final_event_id: string;
  user_id: string;
  response: "accepted" | "declined" | "pending" | string;
  responded_at: string | null;
};


export class HangoutsRepository {
  constructor(private supabase: SupabaseClient) {}

  async getProposal(proposalId: string) {
    const { data, error } = await this.supabase
      .from("hangout_proposals")
      .select("*")
      .eq("proposal_id", proposalId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as HangoutProposalRow | null;
  }

  async listRankedTimeOptions(proposalId: string) {
    const { data, error } = await this.supabase
      .from("proposal_time_options")
      .select("slot_id,proposal_id,start_at,end_at,free_count,busy_count,score")
      .eq("proposal_id", proposalId)
      .order("score", { ascending: false, nullsFirst: false })
      .order("free_count", { ascending: false })
      .order("start_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProposalTimeOptionRow[];
  }

  async listActivityOptions(proposalId: string) {
    const { data, error } = await this.supabase
      .from("proposal_activity_options")
      .select("activity_id,proposal_id,title,details,created_by,created_at,recommendation_id,source_type")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ProposalActivityOptionRow[];
  }

  async listExperienceOptions(proposalId: string) {
    const { data, error } = await this.supabase
      .from("proposal_experience_options")
      .select("experience_id,proposal_id,title,created_at")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ProposalExperienceOptionRow[];
  }

  async getProgress(proposalId: string) {
    // uses your view v_hangout_progress
    const { data, error } = await this.supabase
      .from("v_hangout_progress")
      .select("*")
      .eq("proposal_id", proposalId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async getActivityRanking(proposalId: string) {
    // uses your view v_proposal_activity_ranking (net_score)
    const { data, error } = await this.supabase
      .from("v_proposal_activity_ranking")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("net_score", { ascending: false })
      .order("like_count", { ascending: false })
      .order("dislike_count", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getExperienceRanking(proposalId: string) {
    // create this view if you haven't yet (same formula as activity ranking)
    const { data, error } = await this.supabase
      .from("v_proposal_experience_ranking")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("net_score", { ascending: false })
      .order("like_count", { ascending: false })
      .order("dislike_count", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async rpcRebuildDaySlots(proposalId: string) {
    const { error } = await this.supabase.rpc("rebuild_proposal_day_slots", {
      p_proposal_id: proposalId,
    });
    if (error) throw error;
  }

  async rpcFinalizeAuto(proposalId: string) {
    const { data, error } = await this.supabase.rpc("finalize_hangout_auto", {
      p_proposal_id: proposalId,
    });
    if (error) throw error;
    return data as string; // final_event_id
  }

  async rpcFinalizeManual(proposalId: string, slotId: string, activityId: string | null, experienceId: string | null) {
    // You can keep manual finalize per “type”
    // For now: if you only want slot + one winner, choose activityId OR experienceId.
    // We'll pass activity_id into p_activity_id (can be experience too if you keep one function),
    // OR you can create a separate finalize for experience later.
    const chosen = activityId ?? experienceId;
    if (!chosen) throw new Error("manual finalize requires activityId or experienceId");

    const { data, error } = await this.supabase.rpc("finalize_hangout_manual", {
      p_proposal_id: proposalId,
      p_slot_id: slotId,
      p_activity_id: chosen,
    });
    if (error) throw error;
    return data as string;
  }

    async getFinalEventByProposal(proposalId: string) {
    const { data, error } = await this.supabase
      .from("final_events")
      .select("final_event_id,proposal_id,chosen_slot_id,chosen_activity_id,location,notes,final_status,created_at")
      .eq("proposal_id", proposalId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as FinalEventRow | null;
  }

  async getTimeOptionById(slotId: string) {
    const { data, error } = await this.supabase
      .from("proposal_time_options")
      .select("slot_id,start_at,end_at")
      .eq("slot_id", slotId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async getActivityTitleById(activityId: string) {
    const { data, error } = await this.supabase
      .from("proposal_activity_options")
      .select("title")
      .eq("activity_id", activityId)
      .maybeSingle();
    if (error) throw error;
    return (data?.title ?? null) as string | null;
  }

  async getExperienceTitleById(experienceId: string) {
    const { data, error } = await this.supabase
      .from("proposal_experience_options")
      .select("title")
      .eq("experience_id", experienceId)
      .maybeSingle();
    if (error) throw error;
    return (data?.title ?? null) as string | null;
  }

  async getMyEventResponse(finalEventId: string, userId: string) {
    const { data, error } = await this.supabase
      .from("event_responses")
      .select("final_event_id,user_id,response,responded_at")
      .eq("final_event_id", finalEventId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as EventResponseRow | null;
  }

  async upsertEventResponse(finalEventId: string, userId: string, response: "accepted" | "declined") {
    const { error } = await this.supabase.from("event_responses").upsert(
      {
        final_event_id: finalEventId,
        user_id: userId,
        response,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "final_event_id,user_id" }
    );
    if (error) throw error;
  }

    // ✅ Seed random 5 activities from recommendation_catalog into proposal_activity_options
  async rpcSeedRandomActivities(proposalId: string, createdBy: string, limit = 5) {
    const { error } = await this.supabase.rpc("seed_random_activity_options", {
      p_proposal_id: proposalId,
      p_created_by: createdBy,
      p_limit: limit,
    });
    if (error) throw error;
  }

  // ✅ Seed random 5 experiences/events from recommendation_catalog into proposal_experience_options
  async rpcSeedRandomExperiences(proposalId: string, limit = 5) {
    const { error } = await this.supabase.rpc("seed_random_experience_options", {
      p_proposal_id: proposalId,
      p_limit: limit,
    });
    if (error) throw error;
  }


}
