import type { SupabaseClient } from "@supabase/supabase-js";

export type GroupRow = {
  group_id: string;
  name: string;
  created_by: string;
  timezone: string | null;
  created_at: string;
};

export type GroupUserRow = {
  group_id: string;
  user_id: string;
  role: "host" | "admin" | "member";
  status: "active" | "left" | "removed";
  joined_at: string;
};

export class GroupsRepository {
  constructor(private supabase: SupabaseClient) {}

  // ---------- GROUPS ----------
  async getGroupsByIds(groupIds: string[]) {
    if (groupIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("group")
      .select("group_id,name,created_by,timezone,created_at")
      .in("group_id", groupIds);

    if (error) throw error;
    return (data ?? []) as GroupRow[];
  }

  async getGroupById(groupId: string) {
    const { data, error } = await this.supabase
      .from("group")
      .select("group_id,name,created_by,timezone,created_at")
      .eq("group_id", groupId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as GroupRow | null;
  }

  async createGroup(input: { name: string; created_by: string; timezone: string | null }) {
    const { data, error } = await this.supabase
      .from("group")
      .insert({
        name: input.name,
        created_by: input.created_by,
        timezone: input.timezone,
      })
      .select("group_id,name,created_by,timezone,created_at")
      .single();

    if (error) throw error;
    return data as GroupRow;
  }

  async updateGroup(groupId: string, patch: { name?: string; timezone?: string | null }) {
    const { data, error } = await this.supabase
      .from("group")
      .update(patch)
      .eq("group_id", groupId)
      .select("group_id,name,created_by,timezone,created_at")
      .single();

    if (error) throw error;
    return data as GroupRow;
  }

  // ---------- GROUP USERS ----------
  async getMyGroupLinks(userId: string) {
    const { data, error } = await this.supabase
      .from("group_user")
      .select("group_id,user_id,role,status,joined_at")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) throw error;
    return (data ?? []) as GroupUserRow[];
  }

  async getGroupUser(groupId: string, userId: string) {
    const { data, error } = await this.supabase
      .from("group_user")
      .select("group_id,user_id,role,status,joined_at")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as GroupUserRow | null;
  }

  async addUserToGroup(input: { group_id: string; user_id: string; role: GroupUserRow["role"] }) {
    const { data, error } = await this.supabase
      .from("group_user")
      .insert({
        group_id: input.group_id,
        user_id: input.user_id,
        role: input.role,
        status: "active",
      })
      .select("group_id,user_id,role,status,joined_at")
      .single();

    if (error) throw error;
    return data as GroupUserRow;
  }

  async setMembershipStatus(groupId: string, userId: string, status: GroupUserRow["status"]) {
    const { data, error } = await this.supabase
      .from("group_user")
      .update({ status })
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .select("group_id,user_id,role,status,joined_at")
      .single();

    if (error) throw error;
    return data as GroupUserRow;
  }

  async listActiveMembers(groupId: string) {
    const { data, error } = await this.supabase
      .from("group_user")
      .select("group_id,user_id,role,status,joined_at")
      .eq("group_id", groupId)
      .eq("status", "active");

    if (error) throw error;
    return (data ?? []) as GroupUserRow[];
  }

  async listActiveMembershipsForGroups(groupIds: string[]) {
    if (groupIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("group_user")
      .select("group_id,user_id,role,status,joined_at")
      .in("group_id", groupIds)
      .eq("status", "active");

    if (error) throw error;
    return (data ?? []) as GroupUserRow[];
  }
}
