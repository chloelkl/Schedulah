import type { Request, Response } from "express";
import { createHangout, getHangout } from "../services/hangouts.service.js";

export async function createHangoutController(req: Request, res: Response) {
  const groupId = String(req.params.groupId || "");
  const body = req.body as any;

  if (!groupId) return res.status(400).json({ error: "groupId required" });

  const required = ["host_user_id", "title", "date_start", "date_end", "voting_type"];
  for (const k of required) {
    if (!body?.[k]) return res.status(400).json({ error: `missing ${k}` });
  }

  const out = await createHangout({ ...body, groupId });
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}

export async function getHangoutController(req: Request, res: Response) {
  const proposalId = String(req.params.proposalId || "");
  if (!proposalId) return res.status(400).json({ error: "proposalId required" });

  const out = await getHangout(proposalId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}
