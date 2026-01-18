// client/src/components/hangoutVoting/HangoutVotingOverlay.tsx
import {
  Box,
  Dialog,
  Divider,
  LinearProgress,
  Paper,
  Typography,
  IconButton,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { COLORS } from "../constants/colors";
import { apiGet, apiPost } from "../utils/api";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";

type VoteTimeValue = "free" | "busy" | "unavailable";
type Mode = "activity" | "experience";
type Step = 0 | 1 | 2;

type OverlayProposal = {
  proposal_id: string;
  group_id: string;
  host_user_id: string;
  title: string;
  status: string;
  is_anonymous: boolean;
  locked_at: string | null;
  voting_type?: string;
};

type OverlayProgress = {
  total_active_members: number;
  declined_members: number;
  submitted_members: number;
};

type TimeOption = {
  slot_id: string;
  start_at: string;
  end_at: string;
  free_count: number;
  busy_count: number;
  score: number | null;
};

type ActivityRow = {
  activity_id: string;
  title: string;
  details: string | null;
  like_count: number;
  dislike_count: number;
  net_score: number;
};

type ExperienceRow = {
  experience_id: string;
  title: string;
  like_count: number;
  dislike_count: number;
  net_score: number;
};

type OverlayFinal = {
  final_event_id: string;
  final_status: string;
  created_at: string;

  chosen_slot: {
    slot_id: string;
    start_at: string;
    end_at: string;
  } | null;

  chosen_title: string | null; // activity OR experience OR null
  location: string | null;
  notes: string | null;

  my_response: "accepted" | "declined" | "pending";
};

type OverlayResponse = {
  proposal: OverlayProposal;
  progress: OverlayProgress | null;
  time_options: TimeOption[];
  activities: ActivityRow[];
  experiences: ExperienceRow[];
  can_vote: boolean;
  mode?: Mode;

  // ✅ finalized outcome (null if not finalized yet)
  final?: OverlayFinal | null;
};

type Props = {
  open: boolean;
  proposalId: string | null;
  onClose: () => void;
};

function fmtDaySG(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(d);
}

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

function fmtTimeRangeSG(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const fmt = new Intl.DateTimeFormat("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  });

  return `${fmt.format(start)} → ${fmt.format(end)}`;
}

export default function HangoutVotingOverlay({ open, proposalId, onClose }: Props) {
  const [step, setStep] = useState<Step>(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [overlay, setOverlay] = useState<OverlayResponse | null>(null);

  // Local vote state (MVP)
  const [timeVotes, setTimeVotes] = useState<Record<string, VoteTimeValue>>({});
  const [likes, setLikes] = useState<Record<string, boolean>>({}); // true=like, false=dislike

  const userId = (localStorage.getItem("user_id") || "").trim();

  const mode: Mode = useMemo(() => {
    if (!overlay) return "activity";
    if (overlay.mode) return overlay.mode;
    if ((overlay.experiences?.length ?? 0) > 0 && (overlay.activities?.length ?? 0) === 0) {
      return "experience";
    }
    return "activity";
  }, [overlay]);

  const totalSteps = 3;
  const progressPct = useMemo(() => ((step + 1) / totalSteps) * 100, [step]);

  const canVote = overlay?.can_vote ?? true;

  const isHost = useMemo(() => {
    if (!overlay?.proposal?.host_user_id) return false;
    if (!userId) return false;
    return overlay.proposal.host_user_id === userId;
  }, [overlay?.proposal?.host_user_id, userId, overlay?.proposal]);

  // Reset when opening a new proposal
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setErr("");
    setOverlay(null);
    setTimeVotes({});
    setLikes({});
  }, [open, proposalId]);

  // Fetch overlay
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

        // ✅ If already finalized, jump to review
        if (data?.final) setStep(2);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load overlay";
        if (alive) setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, proposalId]);

  async function refreshOverlay() {
    if (!proposalId) return;
    const data = await apiGet<OverlayResponse>(`/api/hangouts/${proposalId}/overlay`);
    setOverlay(data);
    if (data?.final) setStep(2);
  }

  async function setTimeVote(slotId: string, vote: VoteTimeValue) {
    if (!proposalId) return;

    setTimeVotes((prev) => ({ ...prev, [slotId]: vote }));

    try {
      await apiPost<{ ok: boolean }>(`/api/hangouts/${proposalId}/votes/time`, {
        slot_id: slotId,
        vote,
      });
      await refreshOverlay();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save vote";
      setErr(msg);
    }
  }

  // ✅ NEW: bulk apply
  async function setAllTimeVotes(vote: VoteTimeValue) {
    if (!proposalId || !overlay) return;

    setTimeVotes((prev) => {
      const next = { ...prev };
      for (const t of overlay.time_options) next[t.slot_id] = vote;
      return next;
    });

    try {
      setLoading(true);
      setErr("");

      await Promise.allSettled(
        overlay.time_options.map((t) =>
          apiPost<{ ok: boolean }>(`/api/hangouts/${proposalId}/votes/time`, {
            slot_id: t.slot_id,
            vote,
          })
        )
      );

      await refreshOverlay();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to apply bulk vote";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: “sync calendar” (MVP = refresh overlay)
  async function syncCalendarNow() {
    try {
      setLoading(true);
      setErr("");
      await refreshOverlay();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to sync";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function setSwipeVote(entityId: string, voteValue: boolean) {
    if (!proposalId) return;

    setLikes((prev) => ({ ...prev, [entityId]: voteValue }));

    const path =
      mode === "activity"
        ? `/api/hangouts/${proposalId}/votes/activity`
        : `/api/hangouts/${proposalId}/votes/experience`;

    const payload =
      mode === "activity"
        ? { activity_id: entityId, vote_value: voteValue }
        : { experience_id: entityId, vote_value: voteValue };

    try {
      await apiPost<{ ok: boolean }>(path, payload);
      await refreshOverlay();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save vote";
      setErr(msg);
    }
  }

  async function submit() {
    if (!proposalId) return;
    try {
      setLoading(true);
      setErr("");
      await apiPost<{ ok: boolean }>(`/api/hangouts/${proposalId}/submit`);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function decline() {
    if (!proposalId) return;
    try {
      setLoading(true);
      setErr("");
      await apiPost<{ ok: boolean }>(`/api/hangouts/${proposalId}/decline`);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to decline";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Host controls (Lock & Finalize)
  async function lockFinalize() {
    if (!proposalId) return;
    try {
      setLoading(true);
      setErr("");
      await apiPost(`/api/hangouts/${proposalId}/lock`, {});
      await refreshOverlay();
      setStep(2);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to lock & finalize";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  const title = overlay?.proposal?.title || "Hangout";

  // Review state
  const pickedFreeDays = useMemo(() => {
    if (!overlay) return [];
    const picked = overlay.time_options.filter((t) => timeVotes[t.slot_id] === "free");
    return picked.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [overlay, timeVotes]);

  const likedItems = useMemo(() => {
    if (!overlay) return [];
    const list = mode === "activity" ? overlay.activities : overlay.experiences;

    const getId = (x: ActivityRow | ExperienceRow) =>
      mode === "activity" ? (x as ActivityRow).activity_id : (x as ExperienceRow).experience_id;

    return list.filter((x) => likes[getId(x)] === true);
  }, [overlay, likes, mode]);

  const stepTitle = useMemo(() => {
    if (step === 0) return "Pick dates";
    if (step === 1) return mode === "activity" ? "Swipe activities" : "Swipe experiences";
    return "Review & submit";
  }, [step, mode]);

  // Swipe stack
  const swipeList = useMemo(() => {
    if (!overlay) return [];
    return mode === "activity" ? overlay.activities : overlay.experiences;
  }, [overlay, mode]);

  const [swipeIndex, setSwipeIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSwipeIndex(0);
  }, [open, mode, overlay?.proposal?.proposal_id]);

  const currentCard = useMemo(() => {
    if (!swipeList.length) return null;
    return swipeList[Math.min(swipeIndex, swipeList.length - 1)] ?? null;
  }, [swipeList, swipeIndex]);

  function cardId(card: ActivityRow | ExperienceRow) {
    return mode === "activity"
      ? (card as ActivityRow).activity_id
      : (card as ExperienceRow).experience_id;
  }

  function safeCounts() {
    const p = overlay?.progress;
    if (!p) return "";
    return `${p.submitted_members}/${p.total_active_members} submitted`;
  }

  function goNext() {
    setErr("");
    setStep((s) => (s < 2 ? ((s + 1) as Step) : s));
  }

  function goPrev() {
    setErr("");
    setStep((s) => (s > 0 ? ((s - 1) as Step) : s));
  }

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
            {stepTitle}
            {safeCounts() ? ` • ${safeCounts()}` : ""}
          </Typography>
        </Box>

        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <LinearProgress variant="determinate" value={progressPct} />

      {/* Body */}
      <Box
        sx={{
          p: 1.75,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          flex: 1,
          pb: 10,
        }}
      >
        {loading && (
          <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
            Loading…
          </Typography>
        )}

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
            <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 12 }}>
              Something went wrong
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.25 }}>{err}</Typography>
          </Paper>
        )}

        {!loading && overlay && !canVote && (
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              mb: 1.25,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 12 }}>
              Voting is closed
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.25 }}>
              This hangout was finalized.
            </Typography>
          </Paper>
        )}

        {/* Host controls */}
        {!loading && overlay && isHost && canVote && !overlay.final && (
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              mb: 1.25,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 12 }}>
                Host controls
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.25 }}>
                Lock voting and generate the final result.
              </Typography>
            </Box>

            <FooterBtn
              icon={<CheckRoundedIcon fontSize="small" />}
              label="Lock & Finalize"
              primary
              disabled={loading}
              onClick={lockFinalize}
            />
          </Paper>
        )}

        {/* Final Result */}
        {!loading && overlay?.final && (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 1.25,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 13 }}>
              Final Result
            </Typography>

            <Divider sx={{ my: 1.25 }} />

            <Box sx={{ display: "grid", gap: 0.75 }}>
              <Typography sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 900 }}>
                Time
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                {overlay.final.chosen_slot
                  ? `${fmtDateTimeSG(overlay.final.chosen_slot.start_at)} → ${fmtDateTimeSG(
                      overlay.final.chosen_slot.end_at
                    )}`
                  : "-"}
              </Typography>

              <Typography sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 900, mt: 0.75 }}>
                Chosen
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                {overlay.final.chosen_title ?? "Time-only"}
              </Typography>

              <Typography sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 900, mt: 0.75 }}>
                Location
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                {overlay.final.location ?? "-"}
              </Typography>

              <Typography sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 900, mt: 0.75 }}>
                Notes
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                {overlay.final.notes ?? "-"}
              </Typography>

              <Typography sx={{ fontSize: 11, color: COLORS.grey, fontWeight: 800, mt: 1 }}>
                Status: {overlay.final.final_status} • Created: {fmtDateTimeSG(overlay.final.created_at)}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Step 0: Pick dates (neater + quick actions) */}
        {!loading && overlay && step === 0 && (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 900 }}>
                  Quick actions
                </Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                  Mark faster, or refresh using your calendar events.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <MiniBtn label="Sync calendar" disabled={!canVote || loading} onClick={syncCalendarNow} />
                <MiniBtn label="Free all" disabled={!canVote || loading} onClick={() => setAllTimeVotes("free")} />
                <MiniBtn label="Busy all" disabled={!canVote || loading} onClick={() => setAllTimeVotes("busy")} />
                <MiniBtn
                  label="Unavail all"
                  disabled={!canVote || loading}
                  onClick={() => setAllTimeVotes("unavailable")}
                />
              </Box>
            </Paper>

            <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
              Tap one option per slot.
            </Typography>

            <Box sx={{ display: "grid", gap: 1 }}>
              {overlay.time_options.map((t) => {
                const current = timeVotes[t.slot_id] ?? null;
                const total = overlay.progress?.total_active_members ?? 0;

                return (
                  <Paper
                    key={t.slot_id}
                    elevation={0}
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.55)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 13 }}>
                        {fmtDaySG(t.start_at)}
                      </Typography>

                      <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800, mt: 0.25 }}>
                        {fmtTimeRangeSG(t.start_at, t.end_at)}
                      </Typography>

                      <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800, mt: 0.35 }}>
                        {t.free_count}/{total || "?"} free
                      </Typography>
                    </Box>

                    <Segmented3
                      value={current}
                      disabled={!canVote || loading}
                      onPick={(v) => setTimeVote(t.slot_id, v)}
                    />
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Step 1: Swipe */}
        {!loading && overlay && step === 1 && (
          <Box sx={{ display: "grid", gap: 1.25 }}>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
              Like or dislike. You can stop anytime.
            </Typography>

            {!currentCard && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.65)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>No options yet</Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>
                  Add some {mode === "activity" ? "activities" : "experiences"} to vote on.
                </Typography>
              </Paper>
            )}

            {currentCard && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 4,
                  backgroundColor: "rgba(255,255,255,0.65)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, fontSize: 16 }}>
                  {currentCard.title}
                </Typography>

                {"details" in currentCard && (currentCard as ActivityRow).details ? (
                  <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800, mt: 0.75 }}>
                    {(currentCard as ActivityRow).details}
                  </Typography>
                ) : null}

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: "flex", gap: 1 }}>
                  <ActionButton
                    icon={<BlockRoundedIcon fontSize="small" />}
                    label="Dislike"
                    disabled={!canVote || loading}
                    onClick={async () => {
                      const id = cardId(currentCard);
                      await setSwipeVote(id, false);
                      setSwipeIndex((i) => Math.min(i + 1, swipeList.length));
                    }}
                  />

                  <ActionButton
                    icon={<CheckRoundedIcon fontSize="small" />}
                    label="Like"
                    primary
                    disabled={!canVote || loading}
                    onClick={async () => {
                      const id = cardId(currentCard);
                      await setSwipeVote(id, true);
                      setSwipeIndex((i) => Math.min(i + 1, swipeList.length));
                    }}
                  />
                </Box>

                <Typography sx={{ mt: 1, fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                  {Math.min(swipeIndex + 1, swipeList.length)}/{swipeList.length}
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Step 2: Review */}
        {!loading && overlay && step === 2 && (
          <Box sx={{ display: "grid", gap: 1.25 }}>
            <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
              Double-check your selections before submitting.
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, mb: 1 }}>
                My dates (Free)
              </Typography>

              {pickedFreeDays.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
                  No free dates selected.
                </Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 0.75 }}>
                  {pickedFreeDays.map((t) => (
                    <Typography
                      key={t.slot_id}
                      sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 800 }}
                    >
                      {fmtDaySG(t.start_at)} • {fmtTimeRangeSG(t.start_at, t.end_at)}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, mb: 1 }}>
                My likes ({mode === "activity" ? "Activities" : "Experiences"})
              </Typography>

              {likedItems.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
                  No likes yet.
                </Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 0.75 }}>
                  {likedItems.map((x) => (
                    <Typography
                      key={cardId(x)}
                      sx={{ fontSize: 12, color: COLORS.offBlack, fontWeight: 800 }}
                    >
                      {x.title}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                Submitting marks your response as done (you can still adjust votes until the host finalizes).
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          backgroundColor: COLORS.offWhite,
          borderTop: "1px solid rgba(0,0,0,0.06)",
          zIndex: 5,
          p: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <FooterBtn
          icon={<ArrowBackRoundedIcon fontSize="small" />}
          label="Prev"
          disabled={step === 0 || loading}
          onClick={goPrev}
        />

        {step < 2 ? (
          <FooterBtn
            icon={<ArrowForwardRoundedIcon fontSize="small" />}
            label="Next"
            primary
            disabled={loading}
            onClick={goNext}
          />
        ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
            <FooterBtn
              icon={<BlockRoundedIcon fontSize="small" />}
              label="Decline"
              disabled={!canVote || loading}
              onClick={decline}
            />
            <FooterBtn
              icon={<CheckRoundedIcon fontSize="small" />}
              label="Submit"
              primary
              disabled={!canVote || loading}
              onClick={submit}
            />
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

function MiniBtn({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        px: 1.1,
        py: 0.7,
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        border: "1px solid rgba(0,0,0,0.10)",
        backgroundColor: "rgba(255,255,255,0.8)",
        color: COLORS.offBlack,
        fontWeight: 900,
        fontSize: 11,
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function SegmentedItem({
  label,
  v,
  active,
  disabled,
  onPick,
}: {
  label: string;
  v: VoteTimeValue;
  active: boolean;
  disabled?: boolean;
  onPick: (v: VoteTimeValue) => void;
}) {
  return (
    <Box
      onClick={disabled ? undefined : () => onPick(v)}
      sx={{
        flex: 1,
        textAlign: "center",
        py: 0.75,
        px: 1,
        fontSize: 11,
        fontWeight: 900,
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        border: active ? "1px solid rgba(0,0,0,0.22)" : "1px solid rgba(0,0,0,0.10)",
        backgroundColor: active ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.75)",
        color: COLORS.offBlack,
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function Segmented3({
  value,
  disabled,
  onPick,
}: {
  value: VoteTimeValue | null;
  disabled?: boolean;
  onPick: (v: VoteTimeValue) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.6,
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: 160,
      }}
    >
      <SegmentedItem
        label="Free"
        v="free"
        active={value === "free"}
        disabled={disabled}
        onPick={onPick}
      />
      <SegmentedItem
        label="Busy"
        v="busy"
        active={value === "busy"}
        disabled={disabled}
        onPick={onPick}
      />
      <SegmentedItem
        label="Unavail"
        v="unavailable"
        active={value === "unavailable"}
        disabled={disabled}
        onPick={onPick}
      />
    </Box>
  );
}


function ActionButton({
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
        userSelect: "none",
        border: "1px solid rgba(0,0,0,0.10)",
        backgroundColor: primary ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.75)",
        color: COLORS.offBlack,
        fontWeight: 900,
        fontSize: 12,
        opacity: disabled ? 0.6 : 1,
        position: "relative",
        zIndex: 10,
      }}
    >
      {icon}
      {label}
    </Box>
  );
}

function FooterBtn({
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
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.9,
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        border: "1px solid rgba(0,0,0,0.10)",
        backgroundColor: primary ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.75)",
        color: COLORS.offBlack,
        fontWeight: 900,
        fontSize: 12,
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        position: "relative",
        zIndex: 10,
      }}
    >
      {icon}
      {label}
    </Box>
  );
}
