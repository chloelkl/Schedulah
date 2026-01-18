// server/src/services/hangouts.service.ts
import { supabase } from "../config/db.js";

type VotingType = "time_only" | "time_activity" | "time_event"; // keep for now (you can rename later)

type CreateHangoutInput = {
  groupId: string;
  host_user_id: string;
  title: string;
  date_start: string;
  date_end: string;
  voting_type: VotingType;
  duration_minutes?: number | null;
  activity_hint?: string | null;
  location_hint?: string | null;
  is_anonymous?: boolean;

  // time_activity options (you’re currently storing in proposal_experience_options)
  location_options?: string[];
};

function cleanOptions(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((x) => String(x).trim()).filter(Boolean);
}

export async function createHangout(input: CreateHangoutInput) {
  const cleanedLocationOptions = cleanOptions(input.location_options);

  // Default duration for suggested date-time slots
  const dur =
    typeof input.duration_minutes === "number" && input.duration_minutes > 0
      ? input.duration_minutes
      : 120;

  // 1) Create proposal
  const { data: proposal, error: pErr } = await supabase
    .from("hangout_proposals")
    .insert({
      group_id: input.groupId,
      host_user_id: input.host_user_id,
      title: input.title,
      date_start: input.date_start,
      date_end: input.date_end,
      duration_minutes: dur,
      voting_type: input.voting_type,
      activity_hint: input.voting_type === "time_only" ? (input.activity_hint ?? null) : null,
      location_hint: input.voting_type === "time_only" ? (input.location_hint ?? null) : null,
      status: "voting",
    })
    .select("*")
    .single();

  if (pErr) return { error: pErr.message, status: 500 as const };
  if (!proposal) return { error: "failed to create proposal", status: 500 as const };

  // 2) Build suggested date-time slots (must exist before overlay/voting)
  // Make sure you created this SQL function:
  // public.rebuild_proposal_slots(...)
  const { error: slotErr } = await supabase.rpc("rebuild_proposal_slots", {
    p_proposal_id: proposal.proposal_id,
    p_step_minutes: 30,
    p_duration_minutes: dur,
    p_day_start: "10:00:00",
    p_day_end: "22:00:00",
    p_min_free_ratio: 0.6,
    p_min_spacing_minutes: 120,
    p_max_suggestions: 8,
  });

  if (slotErr) return { error: slotErr.message, status: 500 as const };

  // ✅ NEW (minimal): seed random 5 activity + experience for time_activity
  if (input.voting_type === "time_activity") {
    const { error: seedActErr } = await supabase.rpc("seed_random_activity_options", {
      p_proposal_id: proposal.proposal_id,
      p_created_by: input.host_user_id,
      p_limit: 5,
    });
    if (seedActErr) return { error: seedActErr.message, status: 500 as const };

    const { error: seedExpErr } = await supabase.rpc("seed_random_experience_options", {
      p_proposal_id: proposal.proposal_id,
      p_limit: 5,
    });
    if (seedExpErr) return { error: seedExpErr.message, status: 500 as const };
  }
  
  // ✅ Seed random 5 "event" recommendations into proposal_experience_options for time_event
if (input.voting_type === "time_event") {
  const { error: seedExpErr } = await supabase.rpc("seed_random_experience_options", {
    p_proposal_id: proposal.proposal_id,
    p_limit: 5,
  });
  if (seedExpErr) return { error: seedExpErr.message, status: 500 as const };
}


  // 3) Insert "time_activity" location options into proposal_experience_options (your current design)
  // Insert options only if provided
  const hasLocationOptions = cleanedLocationOptions.length > 0;

  if (input.voting_type === "time_activity" && hasLocationOptions) {
    const rows = cleanedLocationOptions.map((t) => ({
      proposal_id: proposal.proposal_id,
      title: t,
    }));

    const { error: lErr } = await supabase.from("proposal_experience_options").insert(rows);
    if (lErr) return { error: lErr.message, status: 500 as const };
  }

  return { data: proposal, status: 201 as const };
}


export async function getHangout(proposalId: string) {
  const { data: proposal, error: pErr } = await supabase
    .from("hangout_proposals")
    .select("*")
    .eq("proposal_id", proposalId)
    .single();

  if (pErr || !proposal) return { error: "not found", status: 404 as const };

  // Keep return shape stable for UI
  let location_options: any[] = [];

  // If you later rename voting_type time_event -> time_experience, you can also
  // adjust the conditional logic here without breaking createHangout.
  if (proposal.voting_type === "time_activity") {
    const { data: locs, error: lErr } = await supabase
      .from("proposal_experience_options")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    if (lErr) return { error: lErr.message, status: 500 as const };
    location_options = locs ?? [];
  }

  return { data: { ...proposal, location_options }, status: 200 as const };
}
