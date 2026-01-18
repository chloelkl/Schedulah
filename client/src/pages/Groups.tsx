// client/src/pages/Groups.tsx
import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, TextField } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { COLORS } from "../constants/colors";
import InviteJoinOverlay from "../components/InviteJoinOverlay";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

type Group = {
  group_id: string;
  name: string;
  member_count?: number;
  role?: "host" | "admin" | "member";
};

type GroupsApiResponse = {
  groups: Group[];
};

export default function Groups() {
  const nav = useNavigate();
  const location = useLocation();

  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function loadGroups() {
    setLoading(true);
    setErrMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = (await res.json().catch(() => ({}))) as Partial<GroupsApiResponse> & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }

      setGroups(Array.isArray(json.groups) ? json.groups : []);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to load groups";

      setErrMsg(message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(s));
  }, [q, groups]);

  const inviteToken = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("invite") ?? "";
  }, [location.search]);

  function closeInviteOverlay() {
    const sp = new URLSearchParams(location.search);
    sp.delete("invite");
    nav(
      {
        pathname: location.pathname,
        search: sp.toString() ? `?${sp.toString()}` : "",
      },
      { replace: true }
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: COLORS.darkRed,
        color: COLORS.offWhite,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        p: 2,
      }}
    >
      {/* Red card container (Home-style vibe, no beige sheet) */}
      <Paper
        elevation={0}
        sx={{
          width: 360,
          backgroundColor: COLORS.darkRed,
          borderRadius: 6,
          p: 2,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: "center", py: 1.25 }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: COLORS.offWhite }}>
            Groups
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            View your groups and plan hangouts (no chat).
          </Typography>
        </Box>

        {/* Search */}
        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search groups..."
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            mt: 1.5,
            "& .MuiOutlinedInput-root": {
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.12)",
              color: COLORS.offWhite,
            },
            "& fieldset": { borderColor: "rgba(255,255,255,0.22)" },
            "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(255,255,255,0.28)" },
          }}
        />

        {/* List */}
        <Box sx={{ mt: 2, display: "grid", gap: 1.1 }}>
          {loading && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.10)",
                border: "1px dashed rgba(255,255,255,0.26)",
              }}
            >
              <Typography sx={{ fontWeight: 800, color: COLORS.offWhite }}>Loading…</Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.70)", mt: 0.5 }}>
                Fetching your groups
              </Typography>
            </Paper>
          )}

          {!loading && errMsg && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,0,0,0.35)",
              }}
            >
              <Typography sx={{ fontWeight: 800, color: COLORS.offWhite }}>
                Couldn’t load groups
              </Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.70)", mt: 0.5 }}>
                {errMsg}
              </Typography>

              <Typography
                onClick={loadGroups}
                sx={{
                  mt: 1.25,
                  fontSize: 13,
                  fontWeight: 900,
                  color: COLORS.accentPink,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Retry
              </Typography>
            </Paper>
          )}

          {!loading &&
            !errMsg &&
            filtered.map((g) => (
              <Paper
                key={g.group_id}
                elevation={0}
                onClick={() => nav(`/groups/${g.group_id}`)}
                sx={{
                  p: 1.5,
                  borderRadius: 4,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  cursor: "pointer",
                  transition: "transform 0.12s ease, background-color 0.12s ease",
                  "&:active": { transform: "scale(0.99)" },
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.14)" },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: COLORS.offWhite,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.name}
                    </Typography>

                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.70)", mt: 0.25 }}>
                      {g.member_count != null ? `${g.member_count} members` : ""}
                      {g.role ? ` • You: ${g.role}` : ""}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    ›
                  </Box>
                </Box>
              </Paper>
            ))}

          {!loading && !errMsg && filtered.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.10)",
                border: "1px dashed rgba(255,255,255,0.26)",
              }}
            >
              <Typography sx={{ fontWeight: 800, color: COLORS.offWhite }}>No groups found</Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.70)", mt: 0.5 }}>
                Try a different search, or create a group.
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Invite overlay (opens when URL has ?invite=TOKEN) */}
        {inviteToken && (
          <InviteJoinOverlay
            token={inviteToken}
            onClose={closeInviteOverlay}
            onJoined={(groupId) => {
              closeInviteOverlay();
              nav(`/groups/${groupId}`);
            }}
          />
        )}
      </Paper>
    </Box>
  );
}
