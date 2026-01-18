import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";
import { useAddModeAction } from "../contexts/AddModeActionContext";
import { useLocation as useRouterLocation } from "react-router-dom";

import { AddEventTypePicker, type AddEventType } from "../components/events/AddEventTypePicker";
import { OneOffEventForm } from "../components/events/OneOffEventForm";
import {
  RecurringEventForm
} from "../components/events/RecurringEventForm";
import { addWeeksOrMonths } from "../helpers/date-helpers";
import type { OccurUnit, RepeatMode } from "../components/events/RepeatModal";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function isValidYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function AddEvent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { registerSubmit, setIsSubmitting } = useAddModeAction();

  const routerLocation = useRouterLocation();

  const [type, setType] = useState<AddEventType>("event");

  // shared fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // optional location for event + recurring
  const [location, setLocation] = useState("");

  // date/time (date = start date for recurring)
  const [date, setDate] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // recurring-only
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("weekly");
  const [repeatDays, setRepeatDays] = useState<string[]>(["MO"]);
  const [occurUnit, setOccurUnit] = useState<OccurUnit>("weeks");
  const [occurCount, setOccurCount] = useState<number>(4);

  const headerMap: Record<AddEventType, string> = useMemo(
    () => ({
      event: "Event",
      recurring: "Recurring",
      birthday: "Birthday",
      custom: "Custom",
    }),
    []
  );

  // Prefill date from query (?date=YYYY-MM-DD)
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const prefill = params.get("date");
    if (prefill && isValidYmd(prefill)) setDate(prefill);
  }, [routerLocation.search]);

  const submitOneOffEvent = async () => {
    console.log("POST ->", `${API_BASE}/api/events/add`);
    if (type !== "event") return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return showToast("Title is required.", "error");
    if (!date) return showToast("Date is required.", "error");

    const allDay = !startAt && !endAt;

    setIsSubmitting(true);
    try {
      await supabase.auth.getSession();

      const payload = {
        title: trimmedTitle,
        description: description.trim() ? description.trim() : null,
        location: location.trim() ? location.trim() : null,
        date,
        start_at: startAt ? startAt : null,
        end_at: endAt ? endAt : null,
        all_day: allDay,
        category_name: type,
      };

      const res = await fetch(`${API_BASE}/api/events/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to add event.");

      showToast("Event added!");
      navigate("/");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to add event.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRecurringEvent = async () => {
    console.log("POST ->", `${API_BASE}/api/events/add-recurring`);
    if (type !== "recurring") return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return showToast("Title is required.", "error");
    if (!date) return showToast("Start date is required.", "error");

    if (repeatMode === "weekly" && repeatDays.length === 0) {
      return showToast("Pick at least 1 weekday.", "error");
    }

    if (!occurCount || occurCount <= 0) {
      return showToast("Occur for must be at least 1.", "error");
    }

    const allDay = !startAt && !endAt;

    if (repeatMode === "custom") {
      return showToast("Custom dates is coming soon ✨", "info");
    }

    const rrule = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${repeatDays.join(",")}`;
    const until_at = addWeeksOrMonths(date, occurCount, occurUnit);

    setIsSubmitting(true);
    try {
      // await supabase.auth.getSession();

      const payload = {
        // base event
        title: trimmedTitle,
        description: description.trim() ? description.trim() : null,

        location: location.trim() ? location.trim() : null,

        date,
        start_at: startAt ? startAt : null,
        end_at: endAt ? endAt : null,
        all_day: allDay,
        category_name: type,

        // recurrence
        recurrence: {
          rrule,
          until_at, // YYYY-MM-DD
          count: null,
        },
      };

      const res = await fetch(`${API_BASE}/api/events/add-recurring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to add recurring event.");

      showToast("Recurring event added!");
      navigate("/");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to add recurring event.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register submit for app bar
  useEffect(() => {
    if (type === "event") registerSubmit(submitOneOffEvent);
    else if (type === "recurring") registerSubmit(submitRecurringEvent);
    else registerSubmit(null);

    return () => registerSubmit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    type,
    title,
    description,
    location,
    date,
    startAt,
    endAt,
    repeatMode,
    repeatDays,
    occurUnit,
    occurCount,
  ]);

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

        {/* Top icon selector */}
        <AddEventTypePicker type={type} setType={setType} />

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
          {type === "event" && (
            <OneOffEventForm
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              location={location}
              setLocation={setLocation}
              date={date}
              setDate={setDate}
              startAt={startAt}
              setStartAt={setStartAt}
              endAt={endAt}
              setEndAt={setEndAt}
            />
          )}

          {type === "recurring" && (
            <RecurringEventForm
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              location={location}
              setLocation={setLocation}
              date={date}
              setDate={setDate}
              startAt={startAt}
              setStartAt={setStartAt}
              endAt={endAt}
              setEndAt={setEndAt}
              repeatMode={repeatMode}
              setRepeatMode={setRepeatMode}
              repeatDays={repeatDays}
              setRepeatDays={setRepeatDays}
              occurUnit={occurUnit}
              setOccurUnit={setOccurUnit}
              occurCount={occurCount}
              setOccurCount={setOccurCount}
            />
          )}

          {type === "birthday" && (
            <Box sx={{ pt: 2 }}>
              <Typography fontWeight={700} sx={{ color: COLORS.offBlack }}>
                Coming soon ✨
              </Typography>
            </Box>
          )}

          {type === "custom" && (
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
