export type GroupUser = {
  group_id: string;
  user_id: string;
  role: "host" | "admin" | "member";
  status: "active" | "left" | "removed";
  joined_at: string;
};
