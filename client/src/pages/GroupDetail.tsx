// client/src/pages/GroupDetail.tsx
import { Box, Paper, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { COLORS } from "../constants/colors";
import { apiGet, apiPost } from "../utils/api";
import { apiGetOverlay } from "../utils/api";

// ✅ Layout (curved sheet)
import PageSheetLayout from "../components/PageSheetLayout";

// ✅ Voting overlay (wizard)
import HangoutVotingOverlay from "../components/HangoutVotingOverlay";
// ✅ Final overlay (final details + accept/reject)
import HangoutFinalOverlay from "../components/HangoutFinalOverlay";

// MVP: same user id you use in server env (later replace with real auth)
const myUserId = import.meta.env.VITE_HOST_USER_ID ?? "";

type Hangout = {
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
    <PageSheetLayout
      title={data?.name ?? "Group"}
      headerRight={
        canInitiate ? (
          <Box
            onClick={copyInviteLink}
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.22)",
              border: "1px solid rgba(255,255,255,0.28)",
              color: COLORS.offWhite,
              fontWeight: 900,
              fontSize: 12,
              cursor: "pointer",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            Copy invite
          </Box>
        ) : null
      }
      sheetPb={10}
    >
      {!data && !err && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 4,
            backgroundColor: "rgba(255,255,255,0.65)",
            border: "1px dashed rgba(0,0,0,0.18)",
          }}
        >
          <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>Loading…</Typography>
          <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>
            Fetching group details
          </Typography>
        </Paper>
      )}

      {err && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 4,
            backgroundColor: "rgba(255,255,255,0.65)",
            border: "1px dashed rgba(0,0,0,0.18)",
          }}
        >
          <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>Oops</Typography>
          <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.5 }}>{err}</Typography>
        </Paper>
      )}

      {data && (
        <>
          {/* Top info block */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 4,
              backgroundColor: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: COLORS.offBlack }}>
              {data.name}
            </Typography>

            <Typography sx={{ fontSize: 12, color: COLORS.grey, mt: 0.25 }}>
              You: {data.my_role}
            </Typography>

            {!!myUserId && (
              <Typography sx={{ fontSize: 11, color: COLORS.grey, mt: 0.25 }}>
                (MVP user) {myUserId.slice(0, 6)}…
              </Typography>
            )}

            {inviteMsg && (
              <Typography sx={{ mt: 1, fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                {inviteMsg}
              </Typography>
            )}
          </Paper>

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
                          p: 1.5,
                          borderRadius: 4,
                          backgroundColor: "rgba(255,255,255,0.55)",
                          border: "1px solid rgba(0,0,0,0.06)",
                          cursor: "pointer",
                          transition: "transform 0.12s ease",
                          "&:active": { transform: "scale(0.99)" },
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                          <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>
                            {h.title}
                          </Typography>

                          <Box
                            sx={{
                              px: 1.1,
                              py: 0.55,
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 900,
                              backgroundColor: finalised
                                ? "rgba(0,0,0,0.06)"
                                : "rgba(236,157,175,0.35)",
                              color: COLORS.offBlack,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {finalised ? "finalised" : "voting"}
                          </Box>
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
                      backgroundColor: "rgba(255,255,255,0.7)",
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
    </PageSheetLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <Typography sx={{ fontWeight: 900, color: COLORS.offBlack, mb: 1 }}>{title}</Typography>
      {children}
    </Paper>
  );
}
