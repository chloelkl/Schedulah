// server/src/controllers/groups.controller.ts
import type { Request, Response } from "express";
import {
  createGroup,
  getGroupDetail,
  listMyGroups,
  updateGroup,
  leaveGroup,
  listGroupMembers,
} from "../services/groups.service.js";

import { createInviteForGroup } from "../services/invites.service.js";

// You can switch this to: req.user.id later
const HOST_USER_ID = process.env.HOST_USER_ID ?? "";

function getUserId() {
  if (!HOST_USER_ID) return "";
  return HOST_USER_ID;
}

export async function listMyGroupsController(_req: Request, res: Response) {
  const userId = getUserId();
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await listMyGroups(userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  // return as { groups: [...] } (nice for frontend)
  return res.status(out.status).json({ groups: out.data });
}

export async function getGroupDetailController(req: Request, res: Response) {
  const groupId = String(req.params.groupId || "");
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  const userId = getUserId(); // optional, but lets us compute my_role
  const out = await getGroupDetail(groupId, userId || undefined);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}

export async function createGroupController(req: Request, res: Response) {
  const body = req.body as {
    name?: string;
    created_by?: string;
    timezone?: string | null;
  };

  const name = (body.name ?? "").trim();
  const created_by = (body.created_by ?? "").trim() || getUserId();
  const timezone = body.timezone ?? "Asia/Singapore";

  if (!name) return res.status(400).json({ error: "missing name" });
  if (!created_by) return res.status(400).json({ error: "missing created_by" });

  const out = await createGroup({ name, created_by, timezone });
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}

export async function updateGroupController(req: Request, res: Response) {
  const groupId = String(req.params.groupId || "");
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  const userId = getUserId();
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const body = req.body as { name?: string; timezone?: string | null };
  const out = await updateGroup(groupId, body ?? {}, userId);

  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(out.status).json(out.data);
}

export async function leaveGroupController(req: Request, res: Response) {
  const groupId = String(req.params.groupId || "");
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  const userId = getUserId();
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await leaveGroup(groupId, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}

export async function listGroupMembersController(req: Request, res: Response) {
  const groupId = String(req.params.groupId || "");
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  const out = await listGroupMembers(groupId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json({ members: out.data });
}

export async function createGroupInviteController(req: Request, res: Response) {
  const groupId = String(req.params.groupId || "");
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  // MVP: hardcoded user id like your other controllers
  const userId = process.env.HOST_USER_ID ?? "";
  if (!userId) return res.status(400).json({ error: "missing userId" });

  const out = await createInviteForGroup(groupId, userId);
  if ("error" in out) return res.status(out.status).json({ error: out.error });

  return res.status(out.status).json(out.data);
}