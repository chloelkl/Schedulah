import { useState } from "react";
import { Calendar, Briefcase, Cake, Plus } from "lucide-react";
import { Box, Paper, Typography } from "@mui/material";
import { COLORS } from "../constants/colors";


export function AddEvent() {
  const [type, setType] = useState<"event" | "recurring" | "birthday" | "custom">("event");


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
          margin={'auto'}
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


        {/* Placeholder for form body */}
        <Box
          sx={{
            backgroundColor: COLORS.offWhite,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            flexGrow: 1,

          }}
        />
      </Paper>
    </Box>
  );
}