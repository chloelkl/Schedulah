import React, { useMemo, useState } from "react";
import { Box, TextField, Stack, Typography } from "@mui/material";
import { COLORS } from "../../constants/colors";
import { RepeatModal, type RepeatMode, type OccurUnit } from "./RepeatModal";
import { addWeeksOrMonths } from "../../helpers/date-helpers";


export function RecurringEventForm(props: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;

  location: string;
  setLocation: (v: string) => void;

  date: string;
  setDate: (v: string) => void;

  startAt: string;
  setStartAt: (v: string) => void;
  endAt: string;
  setEndAt: (v: string) => void;

  repeatMode: RepeatMode;
  setRepeatMode: (v: RepeatMode) => void;

  repeatDays: string[];
  setRepeatDays: React.Dispatch<React.SetStateAction<string[]>>;

  occurUnit: OccurUnit;
  setOccurUnit: (v: OccurUnit) => void;

  occurCount: number;
  setOccurCount: (v: number) => void;
}) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    location,
    setLocation,
    date,
    setDate,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    repeatMode,
    setRepeatMode,
    repeatDays,
    setRepeatDays,
    occurUnit,
    setOccurUnit,
    occurCount,
    setOccurCount,
  } = props;

  const [repeatOpen, setRepeatOpen] = useState(false);

  const repeatSummary = useMemo(() => {
    if (repeatMode === "custom") return "Custom";
    if (!repeatDays.length) return "Pick days";
    const order = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const sorted = [...repeatDays].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return `Weekly • ${sorted.join(", ")} • For ${occurCount} ${occurUnit}`;
  }, [repeatMode, repeatDays, occurCount, occurUnit]);

  return (
    <>

      <Stack spacing={2} pt={2}>
        <TextField
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          minRows={3}
        />

        <TextField
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          fullWidth
        />

        <TextField
          label="Start date *"
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

        {/* Repeat row that opens modal */}
        <Box
          onClick={() => setRepeatOpen(true)}
          sx={{
            border: `1px solid rgba(0,0,0,0.15)`,
            borderRadius: 3,
            px: 1.5,
            py: 1.25,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <Typography fontSize={13} sx={{ mb: 0.25 }}>
            Repeat **
          </Typography>
          <Typography fontSize={12} sx={{ color: COLORS.grey }}>
            {repeatSummary}
          </Typography>
          <Typography fontSize={12} sx={{ color: COLORS.grey, mt: 0.5 }}>
            Ends on: <b>{date ? addWeeksOrMonths(date, occurCount, occurUnit) : "-"}</b>
          </Typography>
        </Box>
      </Stack >

      <RepeatModal
        open={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        repeatMode={repeatMode}
        repeatDays={repeatDays}
        occurCount={occurCount}
        occurUnit={occurUnit}
        onSet={({ repeatMode, repeatDays, occurCount, occurUnit }) => {
          setRepeatMode(repeatMode);
          setRepeatDays(repeatDays);
          setOccurCount(occurCount);
          setOccurUnit(occurUnit);
        }}
      />
    </>
  );
}
