// client/src/pages/Groups.tsx
import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, TextField, Button } from "@mui/material";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <Box sx={{ px: 2, pt: 2 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 22, color: COLORS.offBlack }}>
        Groups
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 13, color: COLORS.grey }}>
        View your groups and plan hangouts (no chat).
      </Typography>

      <TextField
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search groups..."
        variant="outlined"
        size="small"
        fullWidth
        sx={{
          mt: 2,
          "& .MuiOutlinedInput-root": {
            borderRadius: 999,
            backgroundColor: COLORS.offWhite,
            color: COLORS.offBlack,
          },
          "& fieldset": { borderColor: "rgba(0,0,0,0.10)" },
        }}
      />

      <Box sx={{ mt: 1.25, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          onClick={() => nav("/groups/new")}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 900,
            px: 2.25,
            py: 1,
            backgroundColor: COLORS.accentPink,
            color: "white",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: COLORS.accentPink,
              boxShadow: "none",
              opacity: 0.92,
            },
          }}
        >
          + Create group
        </Button>
      </Box>

      <Box sx={{ mt: 2, display: "grid", gap: 1.25 }}>
        {loading && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: COLORS.offWhite,
              border: "1px dashed rgba(0,0,0,0.18)",
            }}
          >
            <Typography sx={{ fontWeight: 800, color: COLORS.offBlack }}>Loading…</Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>
              Fetching your groups
            </Typography>
          </Paper>
        )}

        {!loading && errMsg && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: COLORS.offWhite,
              border: "1px solid rgba(255,0,0,0.15)",
            }}
          >
            <Typography sx={{ fontWeight: 800, color: COLORS.offBlack }}>
              Couldn’t load groups
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>{errMsg}</Typography>

            <Typography
              onClick={loadGroups}
              sx={{
                mt: 1.25,
                fontSize: 13,
                fontWeight: 800,
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
                borderRadius: 3,
                backgroundColor: COLORS.offWhite,
                border: "1px solid rgba(0,0,0,0.06)",
                cursor: "pointer",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: COLORS.offBlack }}>{g.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.25 }}>
                    {g.member_count != null ? `${g.member_count} members` : ""}
                    {g.role ? ` • You: ${g.role}` : ""}
                  </Typography>
                </Box>
                <Typography sx={{ color: COLORS.grey, fontWeight: 800 }}>›</Typography>
              </Box>
            </Paper>
          ))}

        {!loading && !errMsg && filtered.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: COLORS.offWhite,
              border: "1px dashed rgba(0,0,0,0.18)",
            }}
          >
            <Typography sx={{ fontWeight: 800, color: COLORS.offBlack }}>No groups found</Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>
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
    </Box>
  );
}
