
import { useLocation, useNavigate } from "react-router-dom";
import { Home as HomeIcon, Users, Settings, Plus } from "lucide-react";

import { Typography, Paper, Box } from "@mui/material";
import { COLORS } from "../constants/colors";

export function BottomAppBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;

  const isHome = path === "/";
  const isGroups = path === "/groups";
  const isSettings = path === "/settings";

  const showFab = !isSettings;

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
        backgroundColor: active ? COLORS.accentPink : "transparent",
        color: active ? COLORS.offBlack : COLORS.grey,
        transition: "all 0.2s ease",
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
            backgroundColor: COLORS.offWhite,
            borderRadius: 999,
            px: 1.5,
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "50%"
          }}
        >
          {navItem(isHome, "Home", <HomeIcon size={18} />, () => navigate("/"))}

          {navItem(
            isGroups,
            "Groups",
            <Users size={18} />,
            () => navigate("/groups")
          )}

          {navItem(
            isSettings,
            "Settings",
            <Settings size={18} />,
            () => navigate("/settings")
          )}
        </Paper>

        {/* Floating Action Button */}
        {showFab && (
          <Box
            onClick={() =>
              navigate(isHome ? "/add-event" : "/add-group")
            }
            sx={{
              position: "absolute",
              right: -6,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: COLORS.accentPink,
              height: 44,
              width: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.offBlack,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <Plus size={20} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
