// client/src/pages/NewHangout.tsx
import { useMemo, useState } from "react";
import { Box, Paper, Typography, TextField, MenuItem, Chip, Switch } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { COLORS } from "../constants/colors";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const HOST_USER_ID = "5f4462e1-9a63-48b0-88e7-3be85ee3bb9a"; // MVP: replace later with auth user


type VotingType = "time_only" | "time_activity" | "time_event";
type WindowPreset = "next_week" | "next_2_weeks" | "next_month";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function presetToRange(preset: WindowPreset) {
  const today = new Date();
  const start = today;
  const end =
    preset === "next_week"
      ? addDays(today, 7)
      : preset === "next_2_weeks"
        ? addDays(today, 14)
        : addDays(today, 30);
  return { date_from: toISODate(start), date_to: toISODate(end) };
}

export default function NewHangout() {
  const nav = useNavigate();
  const { groupId } = useParams();

  const [title, setTitle] = useState("Hangout");

  // used later to generate availability slots
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("next_week");
  const dateRange = useMemo(() => presetToRange(windowPreset), [windowPreset]);

  // ✅ rules now:
  // - time_only: can optionally indicate activity + location (not voted)
  // - time_activity: no activity options, but needs location options (voted? or used as options) → we collect them
  // - time_event: nothing to indicate
  const [votingType, setVotingType] = useState<VotingType>("time_only");

  // time_only: hints (not voted)
  const [enableActivityHint, setEnableActivityHint] = useState(false);
  const [activityHint, setActivityHint] = useState("");
  const [enableLocationHint, setEnableLocationHint] = useState(false);
  const [locationHint, setLocationHint] = useState("");

  // time_activity: location options
  const [enableLocationOptions, setEnableLocationOptions] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>([""]);

  const onChangeVotingType = (next: VotingType) => {
    setVotingType(next);

    // reset irrelevant toggles when switching
    if (next !== "time_only") {
      setEnableActivityHint(false);
      setEnableLocationHint(false);
    }
    if (next !== "time_activity") {
      setEnableLocationOptions(false);
    }
  };

  // helpers for location options list
  const updateLocOpt = (i: number, val: string) => {
    setLocationOptions((prev) => prev.map((x, idx) => (idx === i ? val : x)));
  };
  const addLocOpt = () => setLocationOptions((p) => [...p, ""]);
  const removeLocOpt = (i: number) => setLocationOptions((p) => p.filter((_, idx) => idx !== i));

  const showTimeOnly = votingType === "time_only";
  const showTimeActivity = votingType === "time_activity";
  const showTimeEvent = votingType === "time_event";

  const showActivityHint = showTimeOnly && enableActivityHint;
  const showLocationHint = showTimeOnly && enableLocationHint;

  const showLocationOptions = showTimeActivity && enableLocationOptions;

 const onCreate = async () => {
const payload = {
  host_user_id: HOST_USER_ID,
  title,
  date_start: dateRange.date_from,
  date_end: dateRange.date_to,
  voting_type: votingType,
  activity_hint: votingType === "time_only" ? (activityHint.trim() || null) : null,
  location_hint: votingType === "time_only" ? (locationHint.trim() || null) : null,
  location_options:
    votingType === "time_activity"
      ? locationOptions.map((x) => x.trim()).filter(Boolean)
      : [],
};


try {
  const res = await fetch(`${API}/api/groups/${groupId}/hangouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json: unknown = await res.json().catch(() => ({}));
  const errMsg =
    (json as { error?: string })?.error ?? "Failed to create hangout";

  if (!res.ok) throw new Error(errMsg);

  nav(`/groups/${groupId}`);
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Failed to create hangout";
  alert(message);
}}



  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <Typography sx={{ fontWeight: 900, fontSize: 22, color: COLORS.offBlack }}>
        Initiate hangout
      </Typography>
      <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
        Pick a window and what your group votes on.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: 3,
          backgroundColor: COLORS.offWhite,
          border: "1px solid rgba(0,0,0,0.06)",
          display: "grid",
          gap: 1.25,
        }}
      >
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
          sx={fieldSx}
        />

        {/* Time window preset */}
        <Box sx={{ display: "grid", gap: 0.75 }}>
          <TextField
            label="Time window"
            select
            value={windowPreset}
            onChange={(e) => setWindowPreset(e.target.value as WindowPreset)}
            size="small"
            sx={fieldSx}
          >
            <MenuItem value="next_week">Next week</MenuItem>
            <MenuItem value="next_2_weeks">Next 2 weeks</MenuItem>
            <MenuItem value="next_month">Next month</MenuItem>
          </TextField>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={`From ${dateRange.date_from}`} sx={chipSx} />
            <Chip size="small" label={`To ${dateRange.date_to}`} sx={chipSx} />
          </Box>
        </Box>

        {/* Voting type */}
        <TextField
          label="People vote for"
          select
          value={votingType}
          onChange={(e) => onChangeVotingType(e.target.value as VotingType)}
          size="small"
          sx={fieldSx}
        >
          <MenuItem value="time_only">Time only</MenuItem>
          <MenuItem value="time_activity">Time + activity</MenuItem>
          <MenuItem value="time_event">Time + event</MenuItem>
        </TextField>

        {/* time_only: optional indications */}
        {showTimeOnly && (
          <>
            <Box
              sx={{
                borderRadius: 3,
                p: 1.25,
                backgroundColor: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(0,0,0,0.06)",
                display: "grid",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>
                    Activity (optional, not voted)
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
                    Adds context only. People will still vote on time.
                  </Typography>
                </Box>

                <Switch
                  checked={enableActivityHint}
                  onChange={(e) => setEnableActivityHint(e.target.checked)}
                />
              </Box>

              {showActivityHint && (
                <TextField
                  value={activityHint}
                  onChange={(e) => setActivityHint(e.target.value)}
                  size="small"
                  placeholder="e.g. picnic / movie / dinner..."
                  sx={fieldSx}
                />
              )}
            </Box>

            <Box
              sx={{
                borderRadius: 3,
                p: 1.25,
                backgroundColor: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(0,0,0,0.06)",
                display: "grid",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>
                    Location (optional, not voted)
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
                    Adds context only. People will still vote on time.
                  </Typography>
                </Box>

                <Switch
                  checked={enableLocationHint}
                  onChange={(e) => setEnableLocationHint(e.target.checked)}
                />
              </Box>

              {showLocationHint && (
                <TextField
                  value={locationHint}
                  onChange={(e) => setLocationHint(e.target.value)}
                  size="small"
                  placeholder="e.g. Bugis / Orchard / East side..."
                  sx={fieldSx}
                />
              )}
            </Box>
          </>
        )}

        {/* time_activity: location options */}
        {showTimeActivity && (
          <Box
            sx={{
              borderRadius: 3,
              p: 1.25,
              backgroundColor: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(0,0,0,0.06)",
              display: "grid",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>
                  Location options (needed)
                </Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
                  Add places/areas your group can choose from.
                </Typography>
              </Box>

              <Switch
                checked={enableLocationOptions}
                onChange={(e) => setEnableLocationOptions(e.target.checked)}
              />
            </Box>

            {showLocationOptions && (
              <>
                <Box sx={{ display: "grid", gap: 1 }}>
                  {locationOptions.map((loc, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 1,
                        alignItems: "center",
                      }}
                    >
                      <TextField
                        value={loc}
                        onChange={(e) => updateLocOpt(i, e.target.value)}
                        size="small"
                        placeholder="e.g. Bugis, Orchard, Tampines..."
                        sx={fieldSx}
                      />
                      <Box
                        onClick={() => removeLocOpt(i)}
                        sx={pillIconSx}
                        role="button"
                        aria-label="Remove location"
                      >
                        ✕
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Box onClick={addLocOpt} sx={miniPillSx}>
                  + Add location
                </Box>
              </>
            )}
          </Box>
        )}

        {/* time_event: nothing */}
        {showTimeEvent && (
          <Box
            sx={{
              borderRadius: 3,
              p: 1.25,
              backgroundColor: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Typography sx={{ fontWeight: 900, color: COLORS.offBlack }}>
              No extra setup needed
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.grey }}>
              You’re creating a vote for time + event.
            </Typography>
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Box
            onClick={() => nav(`/groups/${groupId}`)}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: 999,
              textAlign: "center",
              cursor: "pointer",
              fontWeight: 900,
              backgroundColor: "rgba(0,0,0,0.06)",
              color: COLORS.offBlack,
              userSelect: "none",
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={onCreate}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: 999,
              textAlign: "center",
              cursor: "pointer",
              fontWeight: 900,
              backgroundColor: COLORS.accentPink,
              color: COLORS.offBlack,
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              userSelect: "none",
            }}
          >
            Create
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
    color: COLORS.offBlack,
  },
  "& fieldset": { borderColor: "rgba(0,0,0,0.10)" },
  "& .MuiInputLabel-root": { color: COLORS.grey },
};

const chipSx = {
  borderRadius: 999,
  fontWeight: 900,
  backgroundColor: "rgba(0,0,0,0.06)",
  color: COLORS.offBlack,
};

const pillIconSx = {
  px: 1.25,
  py: 1,
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  color: COLORS.offBlack,
  backgroundColor: "rgba(0,0,0,0.06)",
  textAlign: "center",
  userSelect: "none",
};

const miniPillSx = {
  mt: 1,
  display: "inline-block",
  px: 1.5,
  py: 1,
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  color: COLORS.offBlack,
  backgroundColor: "rgba(0,0,0,0.06)",
  userSelect: "none",
  fontSize: 12,
};
