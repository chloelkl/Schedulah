// client/src/components/InviteJoinOverlay.tsx
import { useMemo, useState } from "react";
import { Box, Paper, Typography, Button } from "@mui/material";
import { COLORS } from "../constants/colors";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

type Props = {
  token: string;
  onClose: () => void; // we’ll only call this from Reject now
  onJoined: (groupId: string) => void;
};

type JoinInviteResponse = {
  group_id: string;
  joined: boolean;
  error?: string;
};

export default function InviteJoinOverlay({ token, onClose, onJoined }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const canClick = useMemo(() => token.trim().length > 0 && !loading, [token, loading]);

  async function accept() {
    if (!canClick) return;
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`${API_BASE}/api/invites/${token}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = (await res.json().catch(() => ({}))) as Partial<JoinInviteResponse>;

      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      if (!json.group_id) throw new Error("Server did not return group_id");

      onJoined(json.group_id);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to join");
      setLoading(false);
    }
  }

  function reject() {
    onClose();
  }

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,

        // ✨ Glassy backdrop
        backgroundColor: "rgba(0,0,0,0.20)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,

        // Don’t allow dismiss by clicking outside
        pointerEvents: "auto",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: 2.25,
          borderRadius: 4,

          // ✨ Glassy card too
          background: "rgba(248, 244, 236, 0.78)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",

          border: "1px solid rgba(255,255,255,0.55)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
        }}
      >
        <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 20 }}>
          Group invite
        </Typography>

        <Typography sx={{ mt: 0.9, fontSize: 13, color: COLORS.grey }}>
          Someone invited you to join a group.
        </Typography>

        {err && (
          <Typography sx={{ mt: 1.25, fontSize: 12, color: "crimson", fontWeight: 800 }}>
            {err}
          </Typography>
        )}

        <Box sx={{ mt: 2.25, display: "flex", gap: 1.25 }}>
          <Button
            variant="outlined"
            onClick={reject}
            disabled={loading}
            sx={{
              flex: 1,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 900,
              borderColor: "rgba(0,0,0,0.18)",
              color: COLORS.offBlack,
              backgroundColor: "rgba(255,255,255,0.35)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.45)" },
            }}
          >
            Reject
          </Button>

          <Button
            variant="contained"
            onClick={accept}
            disabled={!canClick}
            sx={{
              flex: 1,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 900,
              backgroundColor: COLORS.accentPink,
              boxShadow: "none",
              "&:hover": { backgroundColor: COLORS.accentPink, boxShadow: "none", opacity: 0.92 },
            }}
          >
            {loading ? "Joining..." : "Accept"}
          </Button>
        </Box>

        <Typography sx={{ mt: 1.25, fontSize: 11, color: COLORS.grey }}>
          You must accept or reject to continue.
        </Typography>
      </Paper>
    </Box>
  );
}
