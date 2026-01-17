import { useMemo, useState } from "react";
import { Box, Paper, Typography, TextField, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../constants/colors";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

// TEMP until auth: must match server .env HOST_USER_ID (or you can hardcode same id here)
const HOST_USER_ID = import.meta.env.VITE_HOST_USER_ID ?? "";

type CreateGroupResponse = {
  group_id: string;
  name: string;
  created_by: string;
  timezone: string | null;
  created_at: string;
};

export default function NewGroup() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Singapore");

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0 && !loading, [name, loading]);

  async function onCreate() {
    if (!canSubmit) return;

    // In MVP we need created_by. Later: remove this and use auth on server.
    if (!HOST_USER_ID) {
      setErrMsg("Missing VITE_HOST_USER_ID (temporary until auth is wired).");
      return;
    }

    setLoading(true);
    setErrMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          created_by: HOST_USER_ID,
          timezone: timezone || "Asia/Singapore",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as Partial<CreateGroupResponse> & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }

      // success
      nav("/groups");
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "Failed to create group";
      setErrMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 22, color: COLORS.offBlack }}>
        New Group
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 13, color: COLORS.grey }}>
        Create a group to plan hangouts (no chat).
      </Typography>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 3,
          backgroundColor: COLORS.offWhite,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, mb: 1 }}>
          Group name
        </Typography>

        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. NYP Friends"
          fullWidth
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "white",
            },
          }}
        />

        <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, mt: 2, mb: 1 }}>
          Timezone
        </Typography>

        <TextField
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="Asia/Singapore"
          fullWidth
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "white",
            },
          }}
        />

        {errMsg && (
          <Typography sx={{ mt: 1.5, fontSize: 12, color: "crimson", fontWeight: 800 }}>
            {errMsg}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => nav(-1)}
            disabled={loading}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 900,
              px: 2,
              borderColor: "rgba(0,0,0,0.15)",
              color: COLORS.offBlack,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={!canSubmit}
            onClick={onCreate}
            sx={{
              flex: 1,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 900,
              px: 2,
              backgroundColor: COLORS.accentPink,
              boxShadow: "none",
              "&:hover": { backgroundColor: COLORS.accentPink, boxShadow: "none", opacity: 0.92 },
            }}
          >
            {loading ? "Creating..." : "Create group"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
