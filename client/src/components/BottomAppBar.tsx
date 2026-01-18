import React from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { Calendar, Users, Settings, Plus, Check } from "lucide-react";
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
  const isAddGroup = path === "/groups/new";
  const isAddHangout = matchPath("/groups/:groupId/new-hangout", path) != null;

  const isAddMode = isAddEvent || isAddGroup || isAddHangout;

  const pillLabel = isAddEvent ? "Add Event" : isAddGroup ? "Add Group" : "Add hangout";


  const showFab = !isSettings;

  // ✅ consistent sizing for mobile
  const BAR_H = 52;          // main bar + fab height
  const FAB_CIRCLE = 52;     // circle size
  const FAB_PILL_W = 132;    // pill width in add-mode
  const ICON = 20;

  const leftBarWidth = isAddMode ? "35%" : "50%";
  const fabWidth = isAddMode ? FAB_PILL_W : FAB_CIRCLE;

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
        px: active ? 1.5 : 1.25,
        py: 0.75,
        borderRadius: 999,
        cursor: "pointer",
        backgroundColor: active ? COLORS.offWhite : "transparent",
        color: active ? COLORS.offBlack : COLORS.grey,
        transition: "all 0.2s ease",
        userSelect: "none",
        "& svg": { flexShrink: 0 },
      }}
    >
      {icon}
      {active && (
        <Typography fontSize={12} fontWeight={700} lineHeight={1}>
          {label}
        </Typography>
      )}
    </Box>
  );

  const handleFabClick = async () => {
    if (isAddMode) {
      if (isSubmitting) return;
      await submitFromAppBar();
      return;
    }

    // ✅ If you're on /groups/:groupId, route + to initiate hangout
    const m = matchPath("/groups/:groupId", path);
    const groupId = m?.params?.groupId;

    if (groupId) {
      navigate(`/groups/${groupId}/new-hangout`);
      return;
    } else if (isHome) {
      const params = new URLSearchParams(location.search);
      const d = params.get("d");
      const date = d ?? ymdFromLocalDate(new Date());

      // ✅ default behavior (home -> add-event, else -> new group)
      navigate(`/events/new?date=${encodeURIComponent(date)}`);
    } else {
      navigate('/groups/new')
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: "max(12px, env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(360px, 100vw - 32px)",
        zIndex: 1300,
      }}
    >
      <Box sx={{ position: "relative", height: BAR_H }}>
        {/* Left bar */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: COLORS.accentPink,
            borderRadius: 999,
            height: BAR_H,                 // ✅ consistent height
            px: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: leftBarWidth,
            transition: "width 0.25s ease",
          }}
        >
          {navItem(isHome, "Home", <Calendar size={ICON} />, () => navigate("/"))}
          {navItem(isGroups, "Groups", <Users size={ICON} />, () => navigate("/groups"))}
          {navItem(isSettings, "Settings", <Settings size={ICON} />, () => navigate("/settings"))}
        </Paper>

        {/* Right action button */}
        {showFab && (
          <Box
            onClick={handleFabClick}
            sx={{
              position: "absolute",
              right: -6,
              top: "50%",
              transform: "translateY(-50%)",

              backgroundColor: isAddMode ? COLORS.darkRed : COLORS.accentPink,
              height: BAR_H,               // ✅ same as left bar
              width: fabWidth,
              borderRadius: isAddMode ? 999 : "50%", // ✅ true circle when not add-mode

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              color: isAddMode ? COLORS.offWhite : COLORS.grey,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              transition: "all 0.25s ease",
              userSelect: "none",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {isAddMode ? (
              <Box
                sx={{
                  borderRadius: 999,
                  px: 1.5,
                  py: 0.85,                 // ✅ scales nicely within BAR_H
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Check size={18} />
                <Typography fontSize={12} fontWeight={800} lineHeight={1}>
                  {pillLabel}
                </Typography>
              </Box>
            ) : (
              <Plus size={22} />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
