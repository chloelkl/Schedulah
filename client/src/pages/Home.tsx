import { useState, useMemo, useRef } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "../constants/colors";
import { startOfMonth, endOfMonth, isSameDay } from "../helpers/date-helpers";
import { useNavigate, useLocation } from "react-router-dom";

// =========================
// Animation variants
// =========================
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
};

// =========================
// Component
// =========================
export default function Home() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [direction, setDirection] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();


  const touchStartX = useRef<number | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const startDay = start.getDay();
    const totalDays = end.getDate();

    const cells: { date: Date; inCurrentMonth: boolean }[] = [];

    // previous month filler
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevMonthEnd = endOfMonth(prevMonth).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthEnd - i),
        inCurrentMonth: false,
      });
    }

    // current month days
    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d),
        inCurrentMonth: true,
      });
    }

    // next month filler
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay++),
        inCurrentMonth: false,
      });
    }

    return cells;
  }, [currentMonth]);

  const changeMonth = (dir: "prev" | "next") => {
    setDirection(dir === "next" ? 1 : -1);
    setCurrentMonth(prev =>
      new Date(prev.getFullYear(), prev.getMonth() + (dir === "next" ? 1 : -1), 1)
    );
  };

  // =========================
  // Touch handlers (mobile-first)
  // =========================
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;

    if (Math.abs(diff) < 50) return;

    if (diff > 0) changeMonth("next");
    else changeMonth("prev");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: COLORS.darkRed,
        color: COLORS.offWhite,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{ width: 360, backgroundColor: COLORS.darkRed, borderRadius: 6, p: 2 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>

          <Typography variant="h6" fontWeight={600} sx={{ color: COLORS.offWhite }}>
            {currentMonth.toLocaleString("default", { month: "short", year: "numeric" })}
          </Typography>

        </Box>

        {/* Weekdays */}
        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" textAlign="center" mb={1}>
          {["S", "M", "T", "W", "T", "F", "S"].map(d => (
            <Typography key={d} fontSize={12} color={COLORS.offWhite}>
              {d}
            </Typography>
          ))}
        </Box>

        {/* Animated Calendar Grid */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentMonth.toISOString()}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}
          >
            {days.map((cell, idx) => {
              const { date, inCurrentMonth } = cell;

              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);

              return (
                <Box
                  key={idx}
                  onClick={() => {
                    setSelectedDate(date);

                    const yyyyMmDd =
                      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                    const params = new URLSearchParams(location.search);
                    params.set("d", yyyyMmDd);
                    navigate({ pathname: "/", search: params.toString() }, { replace: true });
                    if (!inCurrentMonth) {
                      setDirection(date > currentMonth ? 1 : -1);
                      setCurrentMonth(startOfMonth(date));
                    }
                  }}
                  sx={{
                    height: 36,
                    width: 36,
                    mx: "auto",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backgroundColor: isSelected ? COLORS.accentPink : "transparent",
                    border: isToday ? `1.5px solid ${COLORS.offWhite}` : "none",
                    opacity: inCurrentMonth ? 1 : 0.4,
                  }}
                >
                  <Typography fontSize={14} fontWeight={isSelected ? 600 : 400} color={COLORS.offWhite}>
                    {date.getDate()}
                  </Typography>
                </Box>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </Paper>
    </Box>
  );
}
