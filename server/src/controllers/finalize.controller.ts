import type { Request, Response } from "express";
import { lockAndCreateFinal } from "../services/finalize.service.js";
import { supabase } from "../config/db.js";

const HOST_USER_ID = process.env.HOST_USER_ID ?? "";

function getUserId(req: Request) {
  const h = String(req.header("x-user-id") || "").trim();
  return h || HOST_USER_ID || "";
}

// POST /api/hangouts/:proposalId/lock
export async function lockProposalController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  const userId = getUserId(req);

  if (!proposalId) return res.status(400).json({ error: "proposalId required" });
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await lockAndCreateFinal(proposalId, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}

// GET /api/hangouts/:proposalId/final
export async function getFinalController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  if (!proposalId) return res.status(400).json({ error: "proposalId required" });

  const { data, error } = await supabase
    .from("final_events")
    .select("*")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "not finalized yet" });

  return res.status(200).json(data);
}
