import { supabase } from "../config/db.js";

function randomToken(len = 24) {
  // URL-safe token
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createInvite(groupId: string, createdBy: string) {
  if (!groupId) return { error: "groupId required", status: 400 as const };
  if (!createdBy) return { error: "createdBy required", status: 400 as const };

  // (Optional) Only allow host/admin to create invite
  const { data: me, error: meErr } = await supabase
    .from("group_user")
    .select("role,status")
    .eq("group_id", groupId)
    .eq("user_id", createdBy)
    .maybeSingle();

  if (meErr) return { error: meErr.message, status: 500 as const };
  if (!me || me.status !== "active") return { error: "not a group member", status: 403 as const };
  if (me.role !== "host" && me.role !== "admin") return { error: "not allowed", status: 403 as const };

  const token = randomToken(28);

  const { data, error } = await supabase
    .from("group_invite")
    .insert({
      group_id: groupId,
      token,
      created_by: createdBy,
      is_active: true,
    })
    .select("token, group_id, created_at, expires_at, max_uses, uses_count, is_active")
    .single();

  if (error) return { error: error.message, status: 500 as const };
  return { data, status: 201 as const };
}

export const createInviteForGroup = createInvite;


export async function joinByInvite(token: string, userId: string) {
  if (!token) return { error: "token required", status: 400 as const };
  if (!userId) return { error: "userId required", status: 400 as const };

  const { data: invite, error: iErr } = await supabase
    .from("group_invite")
    .select("group_id, is_active, expires_at, max_uses, uses_count")
    .eq("token", token)
    .maybeSingle();

  if (iErr) return { error: iErr.message, status: 500 as const };
  if (!invite) return { error: "invite not found", status: 404 as const };
  if (!invite.is_active) return { error: "invite is inactive", status: 400 as const };

  if (invite.expires_at) {
    const exp = new Date(invite.expires_at).getTime();
    if (Date.now() > exp) return { error: "invite expired", status: 400 as const };
  }

  if (invite.max_uses != null && invite.uses_count >= invite.max_uses) {
    return { error: "invite has reached max uses", status: 400 as const };
  }

  const groupId = invite.group_id;

  // already in group?
  const { data: existing, error: eErr } = await supabase
    .from("group_user")
    .select("status")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (eErr) return { error: eErr.message, status: 500 as const };

  if (existing) {
    // if left/removed, re-activate as member
    if (existing.status !== "active") {
      const { error: upErr } = await supabase
        .from("group_user")
        .update({ status: "active", role: "member" })
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (upErr) return { error: upErr.message, status: 500 as const };
    }

    return { data: { group_id: groupId, joined: true }, status: 200 as const };
  }

  // insert membership
  const { error: insErr } = await supabase.from("group_user").insert({
    group_id: groupId,
    user_id: userId,
    role: "member",
    status: "active",
  });

  if (insErr) return { error: insErr.message, status: 500 as const };

  // increment uses_count
  const { error: incErr } = await supabase
    .from("group_invite")
    .update({ uses_count: invite.uses_count + 1 })
    .eq("token", token);

  if (incErr) return { error: incErr.message, status: 500 as const };

  return { data: { group_id: groupId, joined: true }, status: 200 as const };
}
