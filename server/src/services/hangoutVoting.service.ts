// server/src/services/hangoutVoting.service.ts
import { supabase } from "../config/db.js";
import { HangoutsRepository } from "../repositories/hangouts.repository.js";
import { VotesRepository, type TimeVoteValue } from "../repositories/votes.repository.js";

function isLocked(p: { locked_at?: string | null; status?: string | null } | null) {
  if (!p) return false;
  if (p.locked_at) return true;
  if (String(p.status || "").toLowerCase() === "finalized") return true;
  return false;
}

// Helper: progress check (everyone in group has either submitted OR declined)
async function everyoneResponded(proposalId: string) {
  // Uses your view v_hangout_progress
  const { data, error } = await supabase
    .from("v_hangout_progress")
    .select("total_active_members,submitted_members,declined_members")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const total = Number(data?.total_active_members ?? 0);
  const submitted = Number(data?.submitted_members ?? 0);
  const declined = Number(data?.declined_members ?? 0);

  // consider declined as "responded"
  const responded = submitted + declined;

  return { total, submitted, declined, responded, done: total > 0 && responded >= total };
}

export async function getOverlay(proposalId: string, userId: string) {
  const hangoutsRepo = new HangoutsRepository(supabase);

  const proposal = await hangoutsRepo.getProposal(proposalId);
  if (!proposal) return { status: 404, error: "proposal not found" as const };

  const [timeOptions, activityRanking, experienceRanking, progress] = await Promise.all([
    hangoutsRepo.listRankedTimeOptions(proposalId),
    hangoutsRepo.getActivityRanking(proposalId),
    hangoutsRepo.getExperienceRanking(proposalId),
    hangoutsRepo.getProgress(proposalId),
  ]);

  return {
    status: 200 as const,
    data: {
      proposal: {
        proposal_id: proposal.proposal_id,
        group_id: proposal.group_id,
        host_user_id: proposal.host_user_id,
        title: proposal.title,
        status: proposal.status,
        is_anonymous: proposal.is_anonymous ?? false,
        locked_at: proposal.locked_at ?? null,
        voting_type: proposal.voting_type ?? null,
      },
      progress: progress ?? {
        total_active_members: 0,
        declined_members: 0,
        submitted_members: 0,
      },
      time_options: timeOptions,
      activities: activityRanking,
      experiences: experienceRanking,
      can_vote: !isLocked(proposal),
    },
  };
}

export async function voteTime(
  proposalId: string,
  userId: string,
  slotId: string,
  vote: TimeVoteValue
) {
  const hangoutsRepo = new HangoutsRepository(supabase);
  const votesRepo = new VotesRepository(supabase);

  const proposal = await hangoutsRepo.getProposal(proposalId);
  if (!proposal) return { status: 404, error: "proposal not found" as const };
  if (isLocked(proposal)) return { status: 409, error: "proposal is locked" as const };

  await votesRepo.upsertTimeVote(slotId, userId, vote);
  return { status: 200 as const, data: { ok: true } };
}

export async function voteActivity(
  proposalId: string,
  userId: string,
  activityId: string,
  voteValue: boolean
) {
  const hangoutsRepo = new HangoutsRepository(supabase);
  const votesRepo = new VotesRepository(supabase);

  const proposal = await hangoutsRepo.getProposal(proposalId);
  if (!proposal) return { status: 404, error: "proposal not found" as const };
  if (isLocked(proposal)) return { status: 409, error: "proposal is locked" as const };

  await votesRepo.upsertActivityVote(activityId, userId, voteValue);
  return { status: 200 as const, data: { ok: true } };
}

export async function voteExperience(
  proposalId: string,
  userId: string,
  experienceId: string,
  voteValue: boolean
) {
  const hangoutsRepo = new HangoutsRepository(supabase);
  const votesRepo = new VotesRepository(supabase);

  const proposal = await hangoutsRepo.getProposal(proposalId);
  if (!proposal) return { status: 404, error: "proposal not found" as const };
  if (isLocked(proposal)) return { status: 409, error: "proposal is locked" as const };

  await votesRepo.upsertExperienceVote(experienceId, userId, voteValue);
  return { status: 200 as const, data: { ok: true } };
}

export async function declineProposal(proposalId: string, userId: string) {
  const hangoutsRepo = new HangoutsRepository(supabase);
  const votesRepo = new VotesRepository(supabase);

  const proposal = await hangoutsRepo.getProposal(proposalId);
  if (!proposal) return { status: 404, error: "proposal not found" as const };
  if (isLocked(proposal)) return { status: 409, error: "proposal is locked" as const };

  // declining counts as "responded"
  await votesRepo.setMemberStatus(proposalId, userId, "declined");

  // Option B: after ANY response change, check if we should auto-finalize
  try {
    const prog = await everyoneResponded(proposalId);
    if (prog.done) {
      // finalize_hangout_auto will set locked_at + status + insert final_events
      const { error: finErr } = await supabase.rpc("finalize_hangout_auto", {
        p_proposal_id: proposalId,
      });

      // If it fails because someone else already finalized, treat as ok
      if (finErr && !String(finErr.message || "").toLowerCase().includes("already")) {
        return { status: 500 as const, error: finErr.message };
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed to auto finalize";
    return { status: 500 as const, error: msg };
  }

  return { status: 200 as const, data: { ok: true } };
}

export async function submitProposal(proposalId: string, userId: string) {
  const hangoutsRepo = new HangoutsRepository(supabase);
  const votesRepo = new VotesRepository(supabase);

  const proposal = await hangoutsRepo.getProposal(proposalId);
  if (!proposal) return { status: 404, error: "proposal not found" as const };

  // If already finalized/locked, treat as OK (idempotent)
  if (proposal.locked_at || String(proposal.status || "").toLowerCase() === "finalized") {
    return { status: 200 as const, data: { ok: true, already_finalized: true } };
  }

  // 1) mark submitted
  await votesRepo.setMemberStatus(proposalId, userId, "submitted");

  // 2) check if everyone has responded (submitted OR declined)
  const { data: p, error: pErr } = await supabase
    .from("v_hangout_progress")
    .select("total_active_members, submitted_members, declined_members")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (pErr) return { status: 500 as const, error: pErr.message };

  const total = Number(p?.total_active_members ?? 0);
  const submitted = Number(p?.submitted_members ?? 0);
  const declined = Number(p?.declined_members ?? 0);

  const allResponded = total > 0 && submitted + declined >= total;

  // 3) auto-finalize only when everyone responded
  if (allResponded) {
    // IMPORTANT: finalize function must be the one that sets locked_at + inserts final_events
    const { error: fErr } = await supabase.rpc("finalize_hangout_auto", {
      p_proposal_id: proposalId,
    });

    // If it fails because someone else already finalized, just return OK
    if (fErr) {
      const msg = String(fErr.message || "");
      const already = msg.toLowerCase().includes("already locked") || msg.toLowerCase().includes("already");
      if (!already) return { status: 500 as const, error: msg };
    }
  }

  return { status: 200 as const, data: { ok: true, auto_finalized: allResponded } };
}


// You can keep finalizeAuto if you still want a manual endpoint,
// but it should now allow being called even if already locked (race-safe).
export async function finalizeAuto(proposalId: string, userId: string) {
  const hangoutsRepo = new HangoutsRepository(supabase);

  const proposal = await hangoutsRepo.getProposal(proposalId);
  if (!proposal) return { status: 404, error: "proposal not found" as const };

  // MVP: only host can finalize
  if (proposal.host_user_id !== userId) return { status: 403, error: "only host can finalize" as const };

  // If already finalized, just return ok (don’t 409)
  if (isLocked(proposal)) {
    return { status: 200 as const, data: { ok: true, already: true } };
  }

  const { error: finErr } = await supabase.rpc("finalize_hangout_auto", {
    p_proposal_id: proposalId,
  });

  if (finErr) return { status: 500 as const, error: finErr.message };

  return { status: 200 as const, data: { ok: true } };
}
