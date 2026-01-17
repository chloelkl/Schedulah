import { useEffect, useMemo, useState } from "react";
import { Calendar, Briefcase, Cake, Plus } from "lucide-react";
import { Box, Paper, Typography, TextField, Stack, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";
import { useAddModeAction } from "../contexts/AddModeActionContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function AddEvent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { registerSubmit, setIsSubmitting } = useAddModeAction();

  const [type, setType] = useState<"event" | "recurring" | "birthday" | "custom">("event");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const headerMap: Record<typeof type, string> = useMemo(() => ({
    event: "Event",
    recurring: "Recurring",
    birthday: "Birthday",
    custom: "Custom",
  }), []);

  const iconColor = (active: boolean) => (active ? COLORS.offWhite : COLORS.grey);

  const submitEvent = async () => {
    console.log("POST ->", `${API_BASE}/api/events/add`);

    if (type !== "event") return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast("Title is required.", "error");
      return;
    }
    if (!date) {
      showToast("Date is required.", "error");
      return;
    }

    // all_day = true only when BOTH empty
    const allDay = !startAt && !endAt;

    // if only one time filled, allow it (you said optional)
    // you can enforce rules later if you want.

    setIsSubmitting(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      // TODO
      // const accessToken = sessionData.session?.access_token;
      // if (!accessToken) {
      //   showToast("Please sign in again.", "error");
      //   return;
      // }

      const payload = {
        title: trimmedTitle,
        description: description.trim() ? description.trim() : null,
        location: location.trim() ? location.trim() : null,
        date, // yyyy-mm-dd
        start_at: startAt ? startAt : null,
        end_at: endAt ? endAt : null,
        all_day: allDay,
      };

      const res = await fetch(`${API_BASE}/api/events/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error ?? "Failed to add event.";
        throw new Error(msg);
      }

      showToast("Event added!");
      navigate("/");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to add event.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Register submit function so BottomAppBar pill can trigger it
  useEffect(() => {
    registerSubmit(type === "event" ? submitEvent : null);
    return () => registerSubmit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, title, description, location, date, startAt, endAt]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: COLORS.darkRed,
        color: COLORS.offWhite,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          minHeight: "100vh",
          backgroundColor: COLORS.darkRed,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box textAlign="center" py={3}>
          <Typography variant="h6" fontWeight={600} color={COLORS.offWhite}>
            {headerMap[type]}
          </Typography>
        </Box>

        {/* Category Icons */}
        <Box
          display="flex"
          justifyContent="space-around"
          alignItems="center"
          pb={4}
          width={0.8}
          margin={"auto"}
        >
          <Calendar size={30} color={iconColor(type === "event")} onClick={() => setType("event")} style={{ cursor: "pointer" }} />
          <Briefcase size={30} color={iconColor(type === "recurring")} onClick={() => setType("recurring")} style={{ cursor: "pointer" }} />
          <Cake size={30} color={iconColor(type === "birthday")} onClick={() => setType("birthday")} style={{ cursor: "pointer" }} />
          <Plus size={30} color={iconColor(type === "custom")} onClick={() => setType("custom")} style={{ cursor: "pointer" }} />
        </Box>

        {/* Body sheet */}
        <Box
          sx={{
            backgroundColor: COLORS.offWhite,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            flexGrow: 1,
            mt: "auto",
            px: 2.25,
            pt: 2.25,
            pb: 10,
            color: COLORS.offBlack,
          }}
        >
          {type === "event" ? (
            <>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <TextField
                  label="Title *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Study session"
                  fullWidth
                  required
                />

                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes"
                  fullWidth
                  multiline
                  minRows={3}
                />

                <TextField
                  label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. NYP Library"
                  fullWidth
                />

                <TextField
                  label="Date *"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />

                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="Start at"
                    type="time"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End at"
                    type="time"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Stack>
            </>
          ) : (
            <Box sx={{ pt: 2 }}>
              <Typography fontWeight={700} sx={{ color: COLORS.offBlack }}>
                Coming soon ✨
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
