import { useState } from "react";
import { Calendar, Briefcase, Cake, Plus } from "lucide-react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Stack,
} from "@mui/material";
import { COLORS } from "../constants/colors";

export function AddEvent() {
  const [type, setType] = useState<"event" | "recurring" | "birthday" | "custom">(
    "event"
  );

  // event fields (only used when type === "event")
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [startAt, setStartAt] = useState(""); // HH:mm
  const [endAt, setEndAt] = useState(""); // HH:mm

  const headerMap: Record<typeof type, string> = {
    event: "Event",
    recurring: "Recurring",
    birthday: "Birthday",
    custom: "Custom",
  };

  const iconColor = (active: boolean) => (active ? COLORS.offWhite : COLORS.grey);

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
          <Calendar
            size={30}
            color={iconColor(type === "event")}
            onClick={() => setType("event")}
            style={{ cursor: "pointer" }}
          />
          <Briefcase
            size={30}
            color={iconColor(type === "recurring")}
            onClick={() => setType("recurring")}
            style={{ cursor: "pointer" }}
          />
          <Cake
            size={30}
            color={iconColor(type === "birthday")}
            onClick={() => setType("birthday")}
            style={{ cursor: "pointer" }}
          />
          <Plus
            size={30}
            color={iconColor(type === "custom")}
            onClick={() => setType("custom")}
            style={{ cursor: "pointer" }}
          />
        </Box>

        {/* Form body sheet */}
        <Box
          sx={{
            backgroundColor: COLORS.offWhite,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            flexGrow: 1,
            mt: "auto",
            px: 2.25,
            pt: 2.25,
            pb: 10, // space so bottom app bar doesn't cover fields
            color: COLORS.offBlack,
          }}
        >
          {type === "event" ? (
            <>


              <Stack spacing={2} pt={2}>
                {/* title (required) */}
                <TextField
                  label="Title *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Study session"
                  fullWidth
                  required
                />

                {/* description (optional) */}
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes"
                  fullWidth
                  multiline
                  minRows={3}
                />

                {/* location (optional) */}
                <TextField
                  label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Nanyang Polytechnic"
                  fullWidth
                />

                {/* date (required) */}
                <TextField
                  label="Date *"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />

                {/* start/end (optional) */}
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
