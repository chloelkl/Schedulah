// src/components/PageSheetLayout.tsx
import { Box, Paper, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { COLORS } from "../constants/colors";

type Props = {
  title: string;
  headerRight?: ReactNode; // optional (icons, buttons)
  children: ReactNode;
  sheetPb?: number; // optional bottom padding override
};

export default function PageSheetLayout({
  title,
  headerRight,
  children,
  sheetPb = 10,
}: Props) {
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
        {/* Sticky red title bar */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backgroundColor: COLORS.darkRed,
            textAlign: "center",
            py: 3,
          }}
        >
          <Typography variant="h6" fontWeight={600} color={COLORS.offWhite}>
            {title}
          </Typography>

          {/* optional right side slot */}
          {headerRight ? (
            <Box sx={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
              {headerRight}
            </Box>
          ) : null}
        </Box>

        {/* Beige curved sheet */}
        <Box
          sx={{
            backgroundColor: COLORS.offWhite,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            flexGrow: 1,
            mt: "auto",
            px: 2.25,
            pt: 2.25,
            pb: sheetPb,
            color: COLORS.offBlack,
          }}
        >
          {children}
        </Box>
      </Paper>
    </Box>
  );
}
