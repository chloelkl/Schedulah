import type { Request, Response } from "express";
import { createInvite, joinByInvite } from "../services/invites.service.js";

const HOST_USER_ID = process.env.HOST_USER_ID ?? "";
function getUserId() {
  return HOST_USER_ID; // later: from auth
}

export async function createInviteController(req: Request, res: Response) {
  const groupId = String(req.params.groupId || "");
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  const userId = getUserId();
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await createInvite(groupId, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  // You can build full link on frontend, but returning token is enough
  return res.status(out.status).json(out.data);
}

export async function joinInviteController(req: Request, res: Response) {
  const token = String(req.params.token || "");
  if (!token) return res.status(400).json({ error: "token required" });

  const userId = getUserId();
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await joinByInvite(token, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}
