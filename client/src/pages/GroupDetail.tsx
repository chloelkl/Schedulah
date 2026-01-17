// client/src/pages/GroupDetail.tsx
import { Box, Paper, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { COLORS } from "../constants/colors";

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

type Hangout = {
  hangout_id: string;
  title: string;
  status: string;
};

type GroupDetailData = {
  group_id: string;
  name: string;
  my_role: "host" | "admin" | "member";
  members: { user_id: string; display_name?: string; role: "host" | "admin" | "member" }[];
  hangouts: Hangout[];
};

type CreateInviteResponse = {
  token: string;
  group_id: string;
  error?: string;
};

export default function GroupDetail() {
  const nav = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();

  const [data, setData] = useState<GroupDetailData | null>(null);
  const [err, setErr] = useState<string>("");
  const [inviteMsg, setInviteMsg] = useState<string>("");

  useEffect(() => {
    if (!groupId) return;

    let alive = true;

    (async () => {
      try {
        setErr("");
        const res = await fetch(`${API}/api/groups/${groupId}`);
        const json = (await res.json().catch(() => ({}))) as Partial<GroupDetailData> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(json.error || "Failed to load group");
        }

        if (alive) setData(json as GroupDetailData);
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
      const res = await fetch(`${API}/api/groups/${groupId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = (await res.json().catch(() => ({}))) as Partial<CreateInviteResponse>;

      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      if (!json.token) {
        throw new Error("Server did not return invite token");
      }

      const link = `${window.location.origin}/invite/${json.token}`;
      await navigator.clipboard.writeText(link);
      setInviteMsg("Invite link copied!");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create invite";
      setInviteMsg(message);
    }
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

                <Box
                  onClick={() => nav(`/groups/${groupId}/new-hangout`)}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 999,
                    backgroundColor: COLORS.accentPink,
                    color: COLORS.offBlack,
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Initiate hangout
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
                  {data.hangouts.map((h) => (
                    <Paper
                      key={h.hangout_id}
                      elevation={0}
                      sx={{
                        p: 1.25,
                        borderRadius: 3,
                        backgroundColor: "rgba(255,255,255,0.55)",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>
                          {h.title}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: COLORS.grey, fontWeight: 800 }}>
                          {h.status}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
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
        </>
      )}

      {/* Bottom CTA (MVP) */}
      {canInitiate && (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 76,
            px: 2,
            pointerEvents: "none",
          }}
        >
          <Box
            onClick={() => nav(`/groups/${groupId}/new-hangout`)}
            sx={{
              pointerEvents: "auto",
              width: "100%",
              maxWidth: 520,
              mx: "auto",
              py: 1.35,
              borderRadius: 999,
              textAlign: "center",
              cursor: "pointer",
              fontWeight: 900,
              backgroundColor: COLORS.accentPink,
              color: COLORS.offBlack,
              boxShadow: "0 10px 22px rgba(0,0,0,0.14)",
              userSelect: "none",
            }}
          >
            + Initiate hangout
          </Box>
        </Box>
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
