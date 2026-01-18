import {
  Box,
  Dialog,
  Divider,
  LinearProgress,
  Paper,
  Typography,
  IconButton,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { COLORS } from "../constants/colors";
import { apiGet, apiPost } from "../utils/api";

/* =========================
   Types
========================= */

type OverlayFinal = {
  final_event_id: string;
  final_status: string;
  created_at: string;

  chosen_slot: {
    slot_id: string;
    start_at: string;
    end_at: string;
  } | null;

  chosen_title: string | null;
  location: string | null;
  notes: string | null;

  my_response: "accepted" | "declined" | "pending";

  // ✅ NEW (already returned by server)
  accepted_user_ids: string[];
  declined_user_ids: string[];
};

type OverlayResponse = {
  proposal: {
    proposal_id: string;
    group_id: string;
    host_user_id: string;
    title: string;
    status: string;
    is_anonymous: boolean;
    locked_at: string | null;
    voting_type?: string;
  };

  progress:
    | {
        total_active_members: number;
        declined_members: number;
        submitted_members: number;
      }
    | null;

  can_vote: boolean;
  final: OverlayFinal | null;
};

type Props = {
  open: boolean;
  proposalId: string | null;
  onClose: () => void;
};

/* =========================
   Helpers
========================= */

function fmtDateTimeSG(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  }).format(d);
}

/* =========================
   Component
========================= */

export default function HangoutFinalOverlay({ open, proposalId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [overlay, setOverlay] = useState<OverlayResponse | null>(null);

  const title = overlay?.proposal?.title || "Hangout";

  useEffect(() => {
    if (!open) return;
    setErr("");
    setOverlay(null);
  }, [open, proposalId]);

  useEffect(() => {
    if (!open || !proposalId) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet<OverlayResponse>(
          `/api/hangouts/${proposalId}/overlay`
        );
        if (!alive) return;
        setOverlay(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load final";
        if (alive) setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, proposalId]);

  async function refresh() {
    if (!proposalId) return;
    const data = await apiGet<OverlayResponse>(
      `/api/hangouts/${proposalId}/overlay`
    );
    setOverlay(data);
  }

  async function respond(response: "accepted" | "declined") {
    if (!proposalId) return;
    try {
      setLoading(true);
      setErr("");
      await apiPost(`/api/hangouts/${proposalId}/respond`, { response });
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to respond";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  const final = overlay?.final ?? null;

  /* =========================
     Render
  ========================= */

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundColor: COLORS.offWhite,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 24px)",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 14 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
            Final details
          </Typography>
        </Box>

        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <LinearProgress variant="determinate" value={100} />

      {/* Body */}
      <Box sx={{ p: 1.75, overflowY: "auto", flex: 1 }}>
        {err && (
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              mb: 1.25,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.65)",
              border: "1px dashed rgba(0,0,0,0.18)",
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: 12 }}>
              Something went wrong
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey }}>{err}</Typography>
          </Paper>
        )}

        {!loading && final && (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: 13 }}>
              Confirmed plan
            </Typography>

            <Divider sx={{ my: 1.25 }} />

            <Typography sx={{ fontWeight: 900, fontSize: 12 }}>Time</Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
              {final.chosen_slot
                ? `${fmtDateTimeSG(final.chosen_slot.start_at)} → ${fmtDateTimeSG(
                    final.chosen_slot.end_at
                  )}`
                : "-"}
            </Typography>

            <Typography sx={{ fontWeight: 900, fontSize: 12, mt: 1 }}>
              Plan
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
              {final.chosen_title ?? "Time-only"}
            </Typography>

            <Divider sx={{ my: 1.25 }} />

            {/* ✅ RESPONSE SUMMARY */}
            <Typography sx={{ fontWeight: 900, fontSize: 12 }}>
              Responses
            </Typography>

            <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
              ✅ Accepted: {final.accepted_user_ids.length}
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
              ❌ Declined: {final.declined_user_ids.length}
            </Typography>

            <Divider sx={{ my: 1.25 }} />

            <Typography sx={{ fontWeight: 900, fontSize: 12 }}>
              Your response
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
              {final.my_response === "pending"
                ? "Not responded yet"
                : final.my_response === "accepted"
                ? "Accepted"
                : "Declined"}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Btn
                icon={<BlockRoundedIcon fontSize="small" />}
                label="Decline"
                disabled={loading}
                onClick={() => respond("declined")}
              />
              <Btn
                icon={<CheckRoundedIcon fontSize="small" />}
                label="Accept"
                primary
                disabled={loading}
                onClick={() => respond("accepted")}
              />
            </Box>
          </Paper>
        )}
      </Box>
    </Dialog>
  );
}

/* =========================
   Button
========================= */

function Btn({
  icon,
  label,
  primary,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        px: 1.25,
        py: 1,
        borderRadius: 3,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "1px solid rgba(0,0,0,0.10)",
        backgroundColor: primary
          ? "rgba(0,0,0,0.06)"
          : "rgba(255,255,255,0.75)",
        fontWeight: 900,
        fontSize: 12,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon}
      {label}
    </Box>
  );
}
