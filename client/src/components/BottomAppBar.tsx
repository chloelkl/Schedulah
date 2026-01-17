import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Settings,
  Plus,
  Check,
} from "lucide-react";
import { Typography, Paper, Box } from "@mui/material";
import { COLORS } from "../constants/colors";
import { useAddModeAction } from "../contexts/AddModeActionContext";
import { ymdFromLocalDate } from "../helpers/date-helpers";

export function BottomAppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { submitFromAppBar, isSubmitting } = useAddModeAction();

  const path = location.pathname;

  const isHome = path === "/";
  const isGroups = path === "/groups";
  const isSettings = path === "/settings";

  const isAddEvent = path === "/events/new";
  const isAddGroup = path === "/add-group";
  const isAddMode = isAddEvent || isAddGroup;

  const showFab = !isSettings;

  const pillLabel = isAddEvent ? "Add Event" : "Add Group";

  const navItem = (
    active: boolean,
    label: string,
    icon: React.ReactNode,
    onClick: () => void
  ) => (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: active ? 0.75 : 0,
        px: active ? 1.5 : 1,
        py: 0.5,
        borderRadius: 999,
        cursor: "pointer",
        backgroundColor: active ? COLORS.offWhite : "transparent",
        color: active ? COLORS.offBlack : COLORS.grey,
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {icon}
      {active && (
        <Typography fontSize={12} fontWeight={600}>
          {label}
        </Typography>
      )}
    </Box>
  );

  // Left main bar becomes shorter when in add-mode (so the pill can expand)
  const leftBarWidth = isAddMode ? "30%" : "50%";

  // FAB becomes pill when in add-mode
  const fabWidth = isAddMode ? 120 : 44;

  const handleFabClick = async () => {
    if (isAddMode) {
      if (isSubmitting) return;
      await submitFromAppBar(); // ✅ triggers AddEvent submit
      return;
    }
    if (isHome) {
      const params = new URLSearchParams(location.search);
      const d = params.get("d"); // "YYYY-MM-DD" or null
      navigate(d ? `/events/new?date=${encodeURIComponent(d)}` : `/events/new?date=${ymdFromLocalDate(new Date)}`);
    } else {
      navigate("/add-group");
    }
  };



  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(360px, 100vw - 32px)",
        zIndex: 1300,
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Paper
          elevation={0}
          sx={{
            backgroundColor: COLORS.accentPink,
            borderRadius: 999,
            px: 1.5,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: leftBarWidth,
            transition: "width 0.25s ease",
          }}
        >
          {navItem(isHome, "Home", <Calendar size={18} />, () => navigate("/"))}

          {navItem(isGroups, "Groups", <Users size={18} />, () => navigate("/groups"))}

          {navItem(
            isSettings,
            "Settings",
            <Settings size={18} />,
            () => navigate("/settings")
          )}
        </Paper>

        {/* Floating Action Button / Pill */}
        {showFab && (
          <Box
            onClick={handleFabClick}
            sx={{
              position: "absolute",
              right: -6,
              top: "50%",
              transform: "translateY(-50%)",

              backgroundColor: COLORS.accentPink,
              py: 1.9,
              width: fabWidth,
              borderRadius: 999,

              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isAddMode ? 1 : 0,

              color: isAddMode ? COLORS.offBlack : COLORS.grey,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              transition: "all 0.25s ease",
              userSelect: "none",
              px: isAddMode ? 0.75 : 0.5,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {isAddMode ? (
              <Box
                sx={{
                  height: 30,
                  px: 1.5,
                  borderRadius: 999,
                  backgroundColor: COLORS.offWhite,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Check size={18} />
                <Typography fontSize={12} fontWeight={700}>
                  {pillLabel}
                </Typography>
              </Box>
            ) : (
              <Plus size={20} />
            )}
          </Box>

        )
        }
      </Box >
    </Box >
  );
}
