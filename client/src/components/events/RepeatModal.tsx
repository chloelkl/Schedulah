import { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItemButton,
  ListItemText,
  Checkbox,
  Divider,
  TextField,
  MenuItem,
  Button,
} from "@mui/material";
import { COLORS } from "../../constants/colors";
import { DAYSOFWEEK } from "../../helpers/date-helpers";

export type RepeatMode = "weekly" | "custom";
export type OccurUnit = "weeks" | "months";


export function RepeatModal(props: {
  open: boolean;
  onClose: () => void;

  // current values from parent
  repeatMode: RepeatMode;
  repeatDays: string[];
  occurCount: number;
  occurUnit: OccurUnit;

  // commit back to parent when "Set"
  onSet: (next: {
    repeatMode: RepeatMode;
    repeatDays: string[];
    occurCount: number;
    occurUnit: OccurUnit;
  }) => void;
}) {
  const { open, onClose, repeatMode, repeatDays, occurCount, occurUnit, onSet } = props;

  // local draft state (so Cancel doesn't change parent)
  const [mode, setMode] = useState<RepeatMode>(repeatMode);
  const [days, setDays] = useState<string[]>(repeatDays);
  const [count, setCount] = useState<number>(occurCount);
  const [unit, setUnit] = useState<OccurUnit>(occurUnit);

  useEffect(() => {
    if (!open) return;
    setMode(repeatMode);
    setDays(repeatDays);
    setCount(occurCount);
    setUnit(occurUnit);
  }, [open, repeatMode, repeatDays, occurCount, occurUnit]);

  const toggleDay = (key: string) => {
    setDays((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const canSet = mode === "custom" ? true : days.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 6,
          overflow: "hidden",
          backgroundColor: COLORS.darkRed,
          color: COLORS.offWhite,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography fontSize={18} textAlign="center" sx={{ mb: 2 }}>
          Repeat
        </Typography>

        {/* Toggle pill */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            sx={{
              backgroundColor: "transparent",
              border: `1px solid ${COLORS.offWhite}`,
              borderRadius: 999,
              overflow: "hidden",
              "& .MuiToggleButton-root": {
                border: "none",
                color: COLORS.offWhite,
                px: 2.5,
                py: 0.75,
                textTransform: "none",
              },
              "& .MuiToggleButton-root.Mui-selected": {
                backgroundColor: `${COLORS.offWhite} !important`,
                color: `${COLORS.offBlack} !important`,
              },

              "& .MuiToggleButton-root.Mui-selected:hover": {
                backgroundColor: `${COLORS.offWhite} !important`,
              },
            }}
          >
            <ToggleButton value="weekly">
              {mode === "weekly" ? "✓ " : ""}Weekly
            </ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Days list */}
        {mode === "weekly" ? (
          <List sx={{ py: 0 }}>
            {DAYSOFWEEK.map((d) => {
              const checked = days.includes(d.key);
              return (
                <ListItemButton
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  sx={{
                    px: 1,
                    borderRadius: 2,
                    mb: 0,
                  }}
                >
                  <ListItemText
                    primary={d.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      color: COLORS.offWhite,
                    }}
                  />
                  <Checkbox
                    checked={checked}
                    tabIndex={-1}
                    disableRipple
                    sx={{
                      p: 0.5,
                      color: COLORS.accentPink,
                      "&.Mui-checked": { color: COLORS.accentPink },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Box sx={{ py: 1.5, textAlign: "center", opacity: 0.9 }}>
            <Typography fontSize={13}>Custom dates (coming soon)</Typography>
          </Box>
        )}

        <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.15)" }} />

        {/* Occur for */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: '100%', justifyContent: "space-around" }}>
          <Typography fontSize={13}>For</Typography>

          <TextField
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value || 1)))}
            type="number"
            inputProps={{ min: 1 }}
            fullWidth
            sx={{
              width: 70,
              "& .MuiInputBase-root": { color: COLORS.offWhite, height: 40 },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.offWhite },
              "& .MuiInputLabel-root": { color: COLORS.offWhite },
            }}
          />
          <TextField
            select
            value={unit}
            onChange={(e) => setUnit(e.target.value as OccurUnit)}
            fullWidth
            sx={{
              width: 120,
              "& .MuiInputBase-root": {
                color: COLORS.offWhite,
                height: 40
              },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: COLORS.offWhite },
            }}
          >
            <MenuItem value="weeks">weeks</MenuItem>
            <MenuItem value="months">months</MenuItem>
          </TextField>
        </Box>

        {/* Set button */}
        <Box sx={{ mt: 2.5, display: "flex", justifyContent: "center" }}>
          <Button
            disabled={!canSet}
            onClick={() => {
              onSet({
                repeatMode: mode,
                repeatDays: mode === "weekly" ? days : [],
                occurCount: count,
                occurUnit: unit,
              });
              onClose();
            }}
            sx={{
              backgroundColor: COLORS.offWhite,
              color: COLORS.offBlack,
              borderRadius: 999,
              px: 6,
              py: 1.1,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { backgroundColor: COLORS.offWhite },
              "&.Mui-disabled": { opacity: 0.5, color: COLORS.offBlack },
            }}
          >
            Set
          </Button>
        </Box>


      </Box>
    </Dialog >
  );
}
