// server/src/controllers/hangoutVoting.controller.ts
import type { Request, Response } from "express";
import { supabase } from "../config/db.js";
import {
  getOverlay,
  voteTime,
  voteActivity,
  voteExperience,
  declineProposal,
  submitProposal,
  finalizeAuto,
} from "../services/hangoutVoting.service.js";

/** =========================
 *  Types: Overlay Final + Response
 *  ========================= */

export type OverlayFinal = {
  final_event_id: string;
  final_status: string;
  created_at: string;

  chosen_slot: {
    slot_id: string;
    start_at: string;
    end_at: string;
  } | null;

  chosen_title: string | null;
  location: string | null;
  notes: string | null;

  my_response: "accepted" | "declined" | "pending";
  accepted_user_ids: string[];
  declined_user_ids: string[];
};


export type OverlayResponse = {
  proposal: {
    proposal_id: string;
    group_id: string;
    host_user_id: string;
    title: string;
    status: string;
    is_anonymous: boolean;
    locked_at: string | null;
    voting_type?: string;
  };

  progress:
    | {
        total_active_members: number;
        declined_members: number;
        submitted_members: number;
      }
    | null;

  time_options: {
    slot_id: string;
    start_at: string;
    end_at: string;
    free_count: number;
    busy_count: number;
    score: number | null;
  }[];

  activities: {
    activity_id: string;
    title: string;
    details: string | null;
    like_count: number;
    dislike_count: number;
    net_score: number;
  }[];

  experiences: {
    experience_id: string;
    title: string;
    like_count: number;
    dislike_count: number;
    net_score: number;
  }[];

  can_vote: boolean;

  // optional hint for client wizard
  mode?: "activity" | "experience";

  // ✅ finalized outcome (null if not finalized yet)
  final: OverlayFinal | null;
};

/** =========================
 *  Auth (MVP)
 *  ========================= */

const HOST_USER_ID = process.env.HOST_USER_ID ?? "";

/**
 * For MVP: allow overriding user via request header so you can test multiple users:
 * - set header: x-user-id: <uuid>
 * Otherwise falls back to env HOST_USER_ID.
 */
function getUserId(req: Request) {
  const h = String(req.header("x-user-id") || "").trim();
  return h || HOST_USER_ID || "";
}

/** =========================
 *  Helpers to attach final data
 *  ========================= */

async function getFinalForProposal(
  proposalId: string,
  userId: string
): Promise<OverlayFinal | null> {
  // 1) Get final_events row
  const { data: finalRow, error: fErr } = await supabase
    .from("final_events")
    .select(
      `
      final_event_id,
      proposal_id,
      chosen_slot_id,
      chosen_activity_id,
      chosen_experience_id,
      location,
      notes,
      final_status,
      created_at
      `
    )
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (fErr) throw new Error(fErr.message);
  if (!finalRow) return null;

  // 2) Get chosen slot (date + time)
  let chosen_slot: OverlayFinal["chosen_slot"] = null;

  if (finalRow.chosen_slot_id) {
    const { data: slot, error: sErr } = await supabase
      .from("proposal_time_options")
      .select("slot_id,start_at,end_at")
      .eq("slot_id", finalRow.chosen_slot_id)
      .maybeSingle();

    if (sErr) throw new Error(sErr.message);
    if (slot) chosen_slot = slot;
  }

  // 3) Get chosen title (activity OR experience)
  let chosen_title: string | null = null;

  if (finalRow.chosen_activity_id) {
    const { data: a, error: aErr } = await supabase
      .from("proposal_activity_options")
      .select("title")
      .eq("activity_id", finalRow.chosen_activity_id)
      .maybeSingle();

    if (aErr) throw new Error(aErr.message);
    chosen_title = a?.title ?? null;
  } else if (finalRow.chosen_experience_id) {
    const { data: x, error: xErr } = await supabase
      .from("proposal_experience_options")
      .select("title")
      .eq("experience_id", finalRow.chosen_experience_id)
      .maybeSingle();

    if (xErr) throw new Error(xErr.message);
    chosen_title = x?.title ?? null;
  }

  // 4) Responses (accepted / declined / mine)
  let my_response: OverlayFinal["my_response"] = "pending";
  const accepted_user_ids: string[] = [];
  const declined_user_ids: string[] = [];

  try {
    const { data: responses } = await supabase
      .from("event_responses")
      .select("user_id,response")
      .eq("final_event_id", finalRow.final_event_id);

    for (const r of responses ?? []) {
      if (r.response === "accepted") accepted_user_ids.push(r.user_id);
      if (r.response === "declined") declined_user_ids.push(r.user_id);

      if (r.user_id === userId) {
        if (r.response === "accepted") my_response = "accepted";
        if (r.response === "declined") my_response = "declined";
      }
    }
  } catch {
    // Never block final overlay due to response issues
  }

  // 5) Return final overlay payload
  return {
    final_event_id: finalRow.final_event_id,
    final_status: finalRow.final_status,
    created_at: finalRow.created_at,
    chosen_slot,
    chosen_title,
    location: finalRow.location ?? null,
    notes: finalRow.notes ?? null,
    my_response,
    accepted_user_ids,
    declined_user_ids,
  };
}

/** =========================
 *  Controllers
 *  ========================= */

export async function getHangoutOverlayController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  if (!proposalId) {
    return res.status(400).json({ error: "proposalId required" });
  }

  const userId = getUserId(req);
  if (!userId) {
    return res.status(400).json({ error: "missing userId" });
  }

  // 1) Get base overlay data (voting info)
  const out = await getOverlay(proposalId, userId);
if ("error" in out) return res.status(out.status).json({ error: out.error });

const base = out.data as any;

console.log("overlay activities:", base?.activities?.length, base?.activities?.[0]);
console.log("overlay experiences:", base?.experiences?.length, base?.experiences?.[0]);
console.log("overlay mode:", base?.mode);

  // 2) Attach final result if it exists
  let final: OverlayFinal | null = null;
  try {
    final = await getFinalForProposal(proposalId, userId);
  } catch {
    final = null;
  }

  // 3) Final existence controls UI state
  const merged: OverlayResponse = {
    ...base,
    can_vote: !final, // once final exists → voting is over
    final,
  };

  return res.status(200).json(merged);
}


export async function voteTimeController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);
  const body = req.body as { slot_id?: string; vote?: "free" | "busy" | "unavailable" };

  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });
  if (!body?.slot_id) return res.status(400).json({ error: "missing slot_id" });
  if (!body?.vote) return res.status(400).json({ error: "missing vote" });

  const out = await voteTime(proposalId, userId, body.slot_id, body.vote);
  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(200).json(out.data);
}

export async function voteActivityController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);
  const body = req.body as { activity_id?: string; vote_value?: boolean };

  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });
  if (!body?.activity_id) return res.status(400).json({ error: "missing activity_id" });
  if (typeof body.vote_value !== "boolean")
    return res.status(400).json({ error: "missing vote_value" });

  const out = await voteActivity(proposalId, userId, body.activity_id, body.vote_value);
  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(200).json(out.data);
}

export async function voteExperienceController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);
  const body = req.body as { experience_id?: string; vote_value?: boolean };

  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });
  if (!body?.experience_id) return res.status(400).json({ error: "missing experience_id" });
  if (typeof body.vote_value !== "boolean")
    return res.status(400).json({ error: "missing vote_value" });

  const out = await voteExperience(proposalId, userId, body.experience_id, body.vote_value);
  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(200).json(out.data);
}

export async function declineProposalController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);
  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await declineProposal(proposalId, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(200).json(out.data);
}

export async function submitProposalController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);
  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await submitProposal(proposalId, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(200).json(out.data);
}

export async function finalizeAutoController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);
  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await finalizeAuto(proposalId, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(200).json(out.data);
}

/**
 * ✅ NEW: accept/decline final event (once finalized)
 * Route: POST /hangouts/:proposalId/respond
 * Body: { response: "accepted" | "declined" }
 */
export async function respondFinalController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);
  const body = req.body as { response?: "accepted" | "declined" };

  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });
  if (body.response !== "accepted" && body.response !== "declined") {
    return res.status(400).json({ error: "response must be accepted or declined" });
  }

  // find final_event_id
  const { data: finalRow, error: fErr } = await supabase
    .from("final_events")
    .select("final_event_id")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (fErr) return res.status(500).json({ error: fErr.message });
  if (!finalRow?.final_event_id) return res.status(400).json({ error: "not finalized yet" });

  const { error: upErr } = await supabase.from("event_responses").upsert(
    {
      final_event_id: finalRow.final_event_id,
      user_id: userId,
      response: body.response,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "final_event_id,user_id" }
  );

  if (upErr) return res.status(500).json({ error: upErr.message });
  return res.status(200).json({ ok: true });
}
