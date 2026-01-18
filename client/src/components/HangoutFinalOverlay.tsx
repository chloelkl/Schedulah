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
import { useToast } from "../contexts/ToastContext";

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
  const { showToast } = useToast();
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
        const data = await apiGet<OverlayResponse>(`/api/hangouts/${proposalId}/overlay`);
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
    const data = await apiGet<OverlayResponse>(`/api/hangouts/${proposalId}/overlay`);
    setOverlay(data);
  }

  async function respond(response: "accepted" | "declined") {
    if (!proposalId) return;
    try {
      setLoading(true);
      setErr("");
      await apiPost(`/api/hangouts/${proposalId}/respond`, { response });
      await refresh();
      showToast("Event added!");
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
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(17, 0, 0, 0.55)",
            backdropFilter: "blur(6px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 5,
          backgroundColor: COLORS.offWhite,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 24px)",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
        },
      }}
    >
      {/* Header (Schedulah red strip) */}
      <Box
        sx={{
          px: 2,
          pt: 1.75,
          pb: 1.25,
          backgroundColor: COLORS.darkRed,
          color: COLORS.offWhite,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 950,
                fontSize: 15,
                letterSpacing: 0.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>
              Final details
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "rgba(255,255,255,0.9)",
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.18)" },
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ mt: 1.25 }}>
          <LinearProgress
            variant="determinate"
            value={100}
            sx={{
              height: 6,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.18)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: COLORS.accentPink,
                borderRadius: 999,
              },
            }}
          />
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: 2, overflowY: "auto", flex: 1, backgroundColor: COLORS.offWhite }}>
        {err && (
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              mb: 1.25,
              borderRadius: 4,
              backgroundColor: "rgba(255,255,255,0.78)",
              border: "1px dashed rgba(0,0,0,0.18)",
            }}
          >
            <Typography sx={{ fontWeight: 950, fontSize: 12, color: COLORS.offBlack }}>
              Something went wrong
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.25 }}>{err}</Typography>
          </Paper>
        )}

        {!loading && final && (
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 5,
              backgroundColor: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Typography sx={{ fontWeight: 950, fontSize: 13, color: COLORS.offBlack }}>
              Confirmed plan
            </Typography>

            <Divider sx={{ my: 1.25 }} />

            <Box sx={{ display: "grid", gap: 0.9 }}>
              <InfoRow label="Time">
                {final.chosen_slot
                  ? `${fmtDateTimeSG(final.chosen_slot.start_at)} → ${fmtDateTimeSG(
                    final.chosen_slot.end_at
                  )}`
                  : "-"}
              </InfoRow>

              <InfoRow label="Plan">{final.chosen_title ?? "Time-only"}</InfoRow>

              <InfoRow label="Location">{final.location ?? "-"}</InfoRow>

              <InfoRow label="Notes">{final.notes ?? "-"}</InfoRow>
            </Box>

            <Divider sx={{ my: 1.25 }} />

            {/* ✅ RESPONSE SUMMARY */}
            <Typography sx={{ fontWeight: 950, fontSize: 12, color: COLORS.offBlack, mb: 0.75 }}>
              Responses
            </Typography>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <StatPill label="Accepted" value={final.accepted_user_ids.length} />
              <StatPill label="Declined" value={final.declined_user_ids.length} />
            </Box>

            <Divider sx={{ my: 1.25 }} />

            <Typography sx={{ fontWeight: 950, fontSize: 12, color: COLORS.offBlack }}>
              Your response
            </Typography>

            <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Box
                sx={{
                  px: 1.1,
                  py: 0.6,
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.10)",
                  backgroundColor:
                    final.my_response === "accepted"
                      ? "rgba(236,157,175,0.35)"
                      : final.my_response === "declined"
                        ? "rgba(0,0,0,0.06)"
                        : "rgba(255,255,255,0.82)",
                  color: COLORS.offBlack,
                  fontWeight: 950,
                  fontSize: 11,
                }}
              >
                {final.my_response === "pending"
                  ? "Not responded yet"
                  : final.my_response === "accepted"
                    ? "Accepted"
                    : "Declined"}
              </Box>

              <Typography sx={{ fontSize: 11, color: COLORS.grey, fontWeight: 800 }}>
                Status: {final.final_status} • Created: {fmtDateTimeSG(final.created_at)}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 1.25 }}>
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
   Small UI helpers
========================= */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 950 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
        {children}
      </Typography>
    </Box>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <Box
      sx={{
        px: 1.1,
        py: 0.7,
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.10)",
        backgroundColor: "rgba(0,0,0,0.06)",
        color: COLORS.offBlack,
        fontWeight: 950,
        fontSize: 11,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
      }}
    >
      <span style={{ color: COLORS.offBlack }}>{label}</span>
      <Box
        sx={{
          px: 0.9,
          py: 0.35,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.75)",
          border: "1px solid rgba(0,0,0,0.10)",
          fontWeight: 950,
        }}
      >
        {value}
      </Box>
    </Box>
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
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "1px solid rgba(0,0,0,0.10)",
        backgroundColor: primary ? "rgba(236,157,175,0.35)" : "rgba(255,255,255,0.78)",
        fontWeight: 950,
        fontSize: 12,
        color: COLORS.offBlack,
        opacity: disabled ? 0.6 : 1,
        userSelect: "none",
        transition: "transform 0.08s ease",
        "&:active": { transform: "scale(0.99)" },
      }}
    >
      {icon}
      {label}
    </Box>
  );
}
