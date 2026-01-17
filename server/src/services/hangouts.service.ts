import { supabase } from "../config/db.js";

type VotingType = "time_only" | "time_activity" | "time_event";

export type CreateHangoutInput = {
  groupId: string;
  host_user_id: string;
  title: string;
  date_start: string;
  date_end: string;
  duration_minutes?: number;
  voting_type: VotingType;
  activity_hint?: string | null;
  location_hint?: string | null;
  location_options?: string[];
};

export async function createHangout(input: CreateHangoutInput) {
  const cleanedLocationOptions: string[] = Array.isArray(input.location_options)
    ? input.location_options.map((x) => String(x).trim()).filter(Boolean)
    : [];

  if (input.voting_type === "time_activity" && cleanedLocationOptions.length === 0) {
    return { error: "time_activity requires location_options", status: 400 as const };
  }

  const dur = typeof input.duration_minutes === "number" ? input.duration_minutes : 0;

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

  if (input.voting_type === "time_activity") {
    const rows = cleanedLocationOptions.map((t) => ({
      proposal_id: proposal.proposal_id,
      title: t,
    }));

    const { error: lErr } = await supabase.from("proposal_location_options").insert(rows);
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

  let location_options: any[] = [];
  if (proposal.voting_type === "time_activity") {
    const { data: locs, error: lErr } = await supabase
      .from("proposal_location_options")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    if (lErr) return { error: lErr.message, status: 500 as const };
    location_options = locs ?? [];
  }

  return { data: { ...proposal, location_options }, status: 200 as const };
}
