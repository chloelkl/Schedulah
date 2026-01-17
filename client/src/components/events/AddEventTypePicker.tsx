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
  const iconColor = (active: boolean) => (active ? COLORS.offWhite : COLORS.grey);

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
  );
}
