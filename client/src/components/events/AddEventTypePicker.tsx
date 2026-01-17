import { Calendar, Briefcase, Cake, Plus } from "lucide-react";
import { Box } from "@mui/material";
import { COLORS } from "../../constants/colors";

export type AddEventType = "event" | "recurring" | "birthday" | "custom";

export function AddEventTypePicker({
  type,
  setType,
}: {
  type: AddEventType;
  setType: (t: AddEventType) => void;
}) {
  const iconColor = (active: boolean) => (active ? '100%' : '50%');

  return (
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
        opacity={iconColor(type === "event")}
        onClick={() => setType("event")}
        style={{ cursor: "pointer" }}
        color={COLORS.offWhite}
      />
      <Briefcase
        size={30}
        opacity={iconColor(type === "recurring")}
        onClick={() => setType("recurring")}
        style={{ cursor: "pointer" }}
        color={COLORS.offWhite}
      />
      <Cake
        size={30}
        opacity={iconColor(type === "birthday")}
        onClick={() => setType("birthday")}
        style={{ cursor: "pointer" }}
        color={COLORS.offWhite}
      />
      <Plus
        size={30}
        opacity={iconColor(type === "custom")}
        onClick={() => setType("custom")}
        style={{ cursor: "pointer" }}
        color={COLORS.offWhite}
      />
    </Box>
  );
}
