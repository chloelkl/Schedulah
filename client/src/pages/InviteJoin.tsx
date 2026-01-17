import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Paper, Typography, Button } from "@mui/material";
import { COLORS } from "../constants/colors";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

export default function InviteJoin() {
    const { token } = useParams();
    const nav = useNavigate();
    const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
    const [msg, setMsg] = useState<string>("Joining…");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/invites/${token}/join`, { method: "POST" });
                type JoinInviteResponse = {
                    group_id: string;
                    joined: boolean;
                    error?: string;
                };

                const json = (await res.json().catch(() => ({}))) as Partial<JoinInviteResponse>;


                if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

                setStatus("ok");
                setMsg("You’ve joined the group!");
                // go to group detail after a beat
                setTimeout(() => nav(`/groups/${json.group_id}`), 400);
            } catch (e: unknown) {
                setStatus("err");
                setMsg(e instanceof Error ? e.message : "Failed to join");
            }
        })();
    }, [token, nav]);

    return (
        <Box sx={{ px: 2, pt: 2 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 22, color: COLORS.offBlack }}>
                Group Invite
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
                <Typography sx={{ fontWeight: 800, color: COLORS.offBlack }}>{msg}</Typography>

                {status === "err" && (
                    <Button
                        onClick={() => nav("/groups")}
                        sx={{ mt: 2, borderRadius: 999, textTransform: "none", fontWeight: 900 }}
                    >
                        Back to Groups
                    </Button>
                )}
            </Paper>
        </Box>
    );
}
