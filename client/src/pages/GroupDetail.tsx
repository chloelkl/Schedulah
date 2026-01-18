// client/src/pages/GroupDetail.tsx
import { Box, Paper, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { COLORS } from "../constants/colors";
import { apiGet, apiPost } from "../utils/api";
import { apiGetOverlay } from "../utils/api";

// ✅ Voting overlay (wizard)
import HangoutVotingOverlay from "../components/HangoutVotingOverlay";
// ✅ Final overlay (final details + accept/reject)
import HangoutFinalOverlay from "../components/HangoutFinalOverlay";

// MVP: same user id you use in server env (later replace with real auth)
const myUserId = import.meta.env.VITE_HOST_USER_ID ?? "";

type Hangout = {
  // NOTE: your API currently uses hangout_id but your overlay routes use proposalId.
  // If hangout_id == proposal_id in your backend, keep as-is.
  // If not, rename hangout_id to proposal_id in your API response (recommended).
  hangout_id: string;
  title: string;
  status: string; // "voting" | "finalized" etc.
  locked_at?: string | null; // optional (if you have it)
};

type GroupDetailData = {
  group_id: string;
  name: string;
  my_role: "host" | "admin" | "member";
  members: {
    user_id: string;
    display_name?: string;
    role: "host" | "admin" | "member";
  }[];
  hangouts: Hangout[];
};

type CreateInviteResponse = {
  token: string;
  group_id: string;
  error?: string;
};

function isFinalisedHangout(h: Hangout) {
  // pick whatever your backend actually sets
  const s = String(h.status || "").toLowerCase();
  if (s === "finalized" || s === "finalised") return true;
  if (s === "confirmed" || s === "cancelled") return true;
  if (h.locked_at) return true;
  return false;
}

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();

  const [data, setData] = useState<GroupDetailData | null>(null);
  const [err, setErr] = useState<string>("");
  const [inviteMsg, setInviteMsg] = useState<string>("");

  // ✅ split overlays
  const [openVote, setOpenVote] = useState(false);
  const [openFinal, setOpenFinal] = useState(false);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    let alive = true;

    (async () => {
      try {
        setErr("");
        const json = await apiGet<GroupDetailData>(`/api/groups/${groupId}`);
        if (alive) setData(json);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load group";
        if (alive) setErr(message);
      }
    })();

    return () => {
      alive = false;
    };
  }, [groupId]);

  const canInitiate = useMemo(() => !!data, [data]);

  async function copyInviteLink() {
    if (!groupId) return;
    setInviteMsg("");

    try {
      const json = await apiPost<CreateInviteResponse>(`/api/groups/${groupId}/invite`, {});
      if (!json.token) throw new Error("Server did not return invite token");

      const link = `${window.location.origin}/invite/${json.token}`;
      await navigator.clipboard.writeText(link);
      setInviteMsg("Invite link copied!");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create invite";
      setInviteMsg(message);
    }
  }

async function onClickHangout(h: Hangout) {
  const proposalId = h.hangout_id;
  setActiveProposalId(proposalId);

  try {
    const overlay = await apiGetOverlay(proposalId, myUserId);

    const locked =
      !!overlay?.proposal?.locked_at ||
      String(overlay?.proposal?.status || "").toLowerCase() === "finalized" ||
      !!overlay?.final;

    if (locked) {
      setOpenFinal(true);
      setOpenVote(false);
    } else {
      setOpenVote(true);
      setOpenFinal(false);
    }
  } catch {
    // fallback to current list state if overlay fails
    if (isFinalisedHangout(h)) {
      setOpenFinal(true);
      setOpenVote(false);
    } else {
      setOpenVote(true);
      setOpenFinal(false);
    }
  }
}

async function refreshGroup() {
  if (!groupId) return;
  const json = await apiGet<GroupDetailData>(`/api/groups/${groupId}`);
  setData(json);
}


  function closeAllOverlays() {
    setOpenVote(false);
    setOpenFinal(false);
    setActiveProposalId(null);
  }

  return (
    <Box sx={{ px: 2, pt: 2 }}>
      {!data && !err && (
        <Typography sx={{ color: COLORS.grey, fontSize: 13 }}>Loading…</Typography>
      )}

      {err && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: COLORS.offWhite,
            border: "1px dashed rgba(0,0,0,0.18)",
          }}
        >
          <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>Oops</Typography>
          <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>{err}</Typography>
        </Paper>
      )}

      {data && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: 22, color: COLORS.offBlack }}>
                {data.name}
              </Typography>

              <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
                You: {data.my_role}
              </Typography>

              {!!myUserId && (
                <Typography sx={{ fontSize: 11, color: COLORS.grey }}>
                  (MVP user) {myUserId.slice(0, 6)}…
                </Typography>
              )}
            </Box>

            {canInitiate && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Box
                  onClick={copyInviteLink}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.75)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    color: COLORS.offBlack,
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Copy invite
                </Box>
              </Box>
            )}
          </Box>

          {inviteMsg && (
            <Typography sx={{ mt: 1, fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
              {inviteMsg}
            </Typography>
          )}

          <Box sx={{ mt: 2, display: "grid", gap: 1.25 }}>
            <Section title="Hangouts">
              {data.hangouts.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: COLORS.grey }}>No hangouts yet.</Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 1 }}>
                  {data.hangouts.map((h) => {
                    const finalised = isFinalisedHangout(h);

                    return (
                      <Paper
                        key={h.hangout_id}
                        elevation={0}
                        onClick={() => onClickHangout(h)}
                        sx={{
                          p: 1.25,
                          borderRadius: 3,
                          backgroundColor: "rgba(255,255,255,0.55)",
                          border: "1px solid rgba(0,0,0,0.06)",
                          cursor: "pointer",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                          <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>
                            {h.title}
                          </Typography>

                          <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                            {finalised ? "finalised" : "voting"}
                          </Typography>
                        </Box>

                        <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>
                          {finalised ? "Tap to view final" : "Tap to vote"}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Section>

            <Section title="Members">
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {data.members.map((m) => (
                  <Box
                    key={m.user_id}
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 999,
                      backgroundColor: COLORS.offWhite,
                      border: "1px solid rgba(0,0,0,0.06)",
                      fontSize: 12,
                      color: COLORS.offBlack,
                    }}
                  >
                    {m.display_name ?? m.user_id.slice(0, 6)}
                    <span style={{ color: COLORS.grey }}> ({m.role})</span>
                  </Box>
                ))}
              </Box>
            </Section>
          </Box>

          <HangoutVotingOverlay
  open={openVote}
  proposalId={activeProposalId}
  onClose={() => {
    closeAllOverlays();
    refreshGroup();
  }}
/>

<HangoutFinalOverlay
  open={openFinal}
  proposalId={activeProposalId}
  onClose={() => {
    closeAllOverlays();
    refreshGroup();
  }}
/>

        </>
      )}
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 3,
        backgroundColor: COLORS.offWhite,
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, mb: 1 }}>{title}</Typography>
      {children}
    </Paper>
  );
}
