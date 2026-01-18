import { Box, TextField, Stack } from "@mui/material";

export function OneOffEventForm(props: {
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
  } = props;

  return (
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
  );
}
