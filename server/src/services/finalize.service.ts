import { supabase } from "../config/db.js";

type ApiOk<T> = { status: number; data: T };
type ApiErr = { status: number; error: string };

function pickBest<T>(
  arr: T[],
  scoreOf: (x: T) => number,
  tieOf?: (x: T) => string
): T | null {
  if (!arr.length) return null;
  return arr
    .slice()
    .sort((a, b) => {
      const sa = scoreOf(a);
      const sb = scoreOf(b);
      if (sb !== sa) return sb - sa;
      const ta = tieOf ? tieOf(a) : "";
      const tb = tieOf ? tieOf(b) : "";
      return ta.localeCompare(tb);
    })[0];
}

/**
 * Locks a proposal and creates final_events row (idempotent).
 * Rules:
 * - only host/admin can lock
 * - if already finalized, returns existing final
 * - best slot = highest score (fallback: free_count)
 * - activity/experience = highest net_score
 */
export async function lockAndCreateFinal(proposalId: string, userId: string): Promise<ApiOk<any> | ApiErr> {
  // 1) load proposal
  const { data: proposal, error: pErr } = await supabase
    .from("hangout_proposals")
    .select("proposal_id,group_id,host_user_id,status,locked_at,voting_type,title")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (pErr) return { status: 500, error: pErr.message };
  if (!proposal) return { status: 404, error: "proposal not found" };

  // 2) auth: host OR group admin
  const isHost = proposal.host_user_id === userId;

  let isAdmin = false;
  if (!isHost) {
    const { data: gu, error: guErr } = await supabase
      .from("group_user")
      .select("role,status")
      .eq("group_id", proposal.group_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (guErr) return { status: 500, error: guErr.message };
    isAdmin = !!gu && gu.status === "active" && (gu.role === "admin" || gu.role === "host");
  }

  if (!isHost && !isAdmin) return { status: 403, error: "only host/admin can lock" };

  // 3) if already finalized, return existing final
  const { data: existingFinal, error: f0Err } = await supabase
    .from("final_events")
    .select("*")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (f0Err) return { status: 500, error: f0Err.message };
  if (existingFinal) return { status: 200, data: existingFinal };

  // 4) get options + scores (from your existing option tables)
  const [{ data: slots, error: sErr }, { data: acts, error: aErr }, { data: exps, error: xErr }] =
  await Promise.all([
    supabase
      .from("proposal_time_options")
      .select("slot_id,start_at,end_at,score,free_count,busy_count")
      .eq("proposal_id", proposalId),

    supabase
      .from("v_proposal_activity_ranking")
      .select("activity_id,title,net_score,like_count,dislike_count")
      .eq("proposal_id", proposalId),

    supabase
      .from("v_proposal_experience_ranking")
      .select("experience_id,title,net_score,like_count,dislike_count")
      .eq("proposal_id", proposalId),
  ]);


  if (sErr) return { status: 500, error: sErr.message };
  if (aErr) return { status: 500, error: aErr.message };
  if (xErr) return { status: 500, error: xErr.message };

  const timeOptions = slots ?? [];
  const activityOptions = acts ?? [];
  const experienceOptions = exps ?? [];

  // 5) pick winners
  const bestSlot = pickBest(
    timeOptions,
    (t) => (typeof t.score === "number" ? t.score : t.free_count ?? 0),
    (t) => String(t.start_at ?? "")
  );

  // voting_type can be: time_only | time_activity | time_experience (adjust if yours differs)
  let chosen_activity_id: string | null = null;
  let chosen_experience_id: string | null = null;

  if (proposal.voting_type === "time_activity") {
    const bestAct = pickBest(activityOptions, (a) => a.net_score ?? 0, (a) => a.title ?? "");
    chosen_activity_id = bestAct?.activity_id ?? null;
  } else if (proposal.voting_type === "time_experience") {
    const bestExp = pickBest(experienceOptions, (x) => x.net_score ?? 0, (x) => x.title ?? "");
    chosen_experience_id = bestExp?.experience_id ?? null;
  }

  // 6) create final_events row
  const insertPayload = {
    proposal_id: proposalId,
    chosen_slot_id: bestSlot?.slot_id ?? null,
    chosen_activity_id,
    chosen_experience_id,
    location: null,
    notes: null,
    final_status: "pending",
  };

  const { data: finalInserted, error: insErr } = await supabase
    .from("final_events")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insErr) return { status: 500, error: insErr.message };

  // 7) lock proposal (so voting UI turns off)
  const { error: lockErr } = await supabase
    .from("hangout_proposals")
    .update({
      locked_at: new Date().toISOString(),
      status: "finalized",
    })
    .eq("proposal_id", proposalId);

  if (lockErr) {
    // final exists already, but proposal didn't lock; still return final and let you debug
    return { status: 200, data: { ...finalInserted, warning: lockErr.message } };
  }

  return { status: 201, data: finalInserted };
}
