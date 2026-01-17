// server/src/services/groups.service.ts
import { supabase } from "../config/db.js";

type Role = "host" | "admin" | "member";
type Status = "active" | "left" | "removed";

type CreateGroupInput = {
  name: string;
  created_by: string;
  timezone?: string | null;
};

export async function createGroup(input: CreateGroupInput) {
  const name = input.name.trim();
  if (!name) return { error: "missing name", status: 400 as const };
  if (!input.created_by) return { error: "missing created_by", status: 400 as const };

  const { data: g, error: gErr } = await supabase
    .from("group")
    .insert({
      name,
      created_by: input.created_by,
      timezone: input.timezone ?? null,
    })
    .select("*")
    .single();

  if (gErr) return { error: gErr.message, status: 500 as const };
  if (!g) return { error: "failed to create group", status: 500 as const };

  // creator becomes host (recommended)
  const { error: guErr } = await supabase.from("group_user").insert({
    group_id: g.group_id,
    user_id: input.created_by,
    role: "host" as Role,
    status: "active" as Status,
  });

  if (guErr) return { error: guErr.message, status: 500 as const };

  return { data: g, status: 201 as const };
}

export async function getGroupDetail(groupId: string, userId?: string) {
  const { data: g, error: gErr } = await supabase
    .from("group")
    .select("*")
    .eq("group_id", groupId)
    .single();

  if (gErr || !g) return { error: "group not found", status: 404 as const };

  const { data: members, error: mErr } = await supabase
    .from("group_user")
    .select("user_id, role, status, joined_at")
    .eq("group_id", groupId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (mErr) return { error: mErr.message, status: 500 as const };

  // optional: compute my role properly if userId is provided
  let my_role: Role | null = null;
  if (userId) {
    const { data: me, error: meErr } = await supabase
      .from("group_user")
      .select("role,status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (meErr) return { error: meErr.message, status: 500 as const };
    if (me && me.status === "active") my_role = me.role as Role;
  }

  const { data: hangouts, error: hErr } = await supabase
    .from("hangout_proposals")
    .select("proposal_id, title, status, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (hErr) return { error: hErr.message, status: 500 as const };

  const hangoutCards = (hangouts ?? []).map((x) => ({
    hangout_id: x.proposal_id,
    title: x.title,
    status: x.status,
  }));

  return {
    data: {
      ...g,
      my_role: my_role ?? "member", // fallback for MVP
      members: members ?? [],
      hangouts: hangoutCards,
    },
    status: 200 as const,
  };
}

/**
 * ✅ Groups list for your React "Groups" page
 * Returns: [{ group_id, name, member_count, role }]
 */
export async function listMyGroups(userId: string) {
  if (!userId) return { error: "missing userId", status: 400 as const };

  // 1) find my active memberships
  const { data: links, error: lErr } = await supabase
    .from("group_user")
    .select("group_id, role")
    .eq("user_id", userId)
    .eq("status", "active");

  if (lErr) return { error: lErr.message, status: 500 as const };

  const groupIds = (links ?? []).map((x) => x.group_id);
  if (groupIds.length === 0) return { data: [], status: 200 as const };

  // 2) load groups
  const { data: groups, error: gErr } = await supabase
    .from("group")
    .select("group_id, name, timezone, created_at")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });

  if (gErr) return { error: gErr.message, status: 500 as const };

  // 3) count members (active) for these groups
  const { data: memberships, error: mErr } = await supabase
    .from("group_user")
    .select("group_id")
    .in("group_id", groupIds)
    .eq("status", "active");

  if (mErr) return { error: mErr.message, status: 500 as const };

  const countMap = new Map<string, number>();
  for (const row of memberships ?? []) {
    countMap.set(row.group_id, (countMap.get(row.group_id) ?? 0) + 1);
  }

  const roleMap = new Map<string, Role>();
  for (const row of links ?? []) {
    roleMap.set(row.group_id, row.role as Role);
  }

  const cards = (groups ?? []).map((g) => ({
    group_id: g.group_id,
    name: g.name,
    member_count: countMap.get(g.group_id) ?? 0,
    role: roleMap.get(g.group_id) ?? ("member" as Role),
  }));

  return { data: cards, status: 200 as const };
}

export async function updateGroup(
  groupId: string,
  patch: { name?: string; timezone?: string | null },
  actorUserId: string
) {
  if (!groupId) return { error: "groupId required", status: 400 as const };
  if (!actorUserId) return { error: "userId required", status: 400 as const };

  // authz: must be host/admin
  const { data: me, error: meErr } = await supabase
    .from("group_user")
    .select("role,status")
    .eq("group_id", groupId)
    .eq("user_id", actorUserId)
    .maybeSingle();

  if (meErr) return { error: meErr.message, status: 500 as const };
  if (!me || me.status !== "active") return { error: "not a group member", status: 403 as const };

  const role = me.role as Role;
  if (role !== "host" && role !== "admin") return { error: "not allowed", status: 403 as const };

  const clean: { name?: string; timezone?: string | null } = {};
  if (patch.name !== undefined) {
    const nm = patch.name.trim();
    if (!nm) return { error: "name cannot be empty", status: 400 as const };
    clean.name = nm;
  }
  if (patch.timezone !== undefined) clean.timezone = patch.timezone;

  const { data, error } = await supabase
    .from("group")
    .update(clean)
    .eq("group_id", groupId)
    .select("*")
    .single();

  if (error) return { error: error.message, status: 500 as const };
  return { data, status: 200 as const };
}

export async function leaveGroup(groupId: string, userId: string) {
  if (!groupId) return { error: "groupId required", status: 400 as const };
  if (!userId) return { error: "userId required", status: 400 as const };

  const { data: me, error: meErr } = await supabase
    .from("group_user")
    .select("status")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (meErr) return { error: meErr.message, status: 500 as const };
  if (!me || me.status !== "active") return { error: "not an active member", status: 400 as const };

  const { error } = await supabase
    .from("group_user")
    .update({ status: "left" as Status })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { error: error.message, status: 500 as const };
  return { data: { ok: true }, status: 200 as const };
}

export async function listGroupMembers(groupId: string) {
  if (!groupId) return { error: "groupId required", status: 400 as const };

  const { data, error } = await supabase
    .from("group_user")
    .select("user_id, role, status, joined_at")
    .eq("group_id", groupId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (error) return { error: error.message, status: 500 as const };
  return { data: data ?? [], status: 200 as const };
}
