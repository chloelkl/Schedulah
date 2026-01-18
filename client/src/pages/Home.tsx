import { useEffect, useState, useMemo, useRef } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "../constants/colors";
import { startOfMonth, endOfMonth, isSameDay, prettyDate, prettyTimeRange, ymdFromLocalDate } from "../helpers/date-helpers";
import { useNavigate, useLocation } from "react-router-dom";
import { Briefcase, Cake, Calendar } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// =========================
// Types
// =========================
export type DayEvent = {
  event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string; // YYYY-MM-DD
  start_at: string | null; // HH:mm
  end_at: string | null; // HH:mm
  all_day: boolean;
  category?: { name: string; color: string | null } | null;
};

type MonthDots = Record<string, string[]>; // "YYYY-MM-DD" -> ["#hex", "#hex"]

const GRID_ROWS = 6;      // your grid is always padded to full weeks
const CELL = 36;
const GAP = 8;
const GRID_H = GRID_ROWS * CELL + (GRID_ROWS - 1) * GAP; // 6*36 + 5*8 = 256


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

const getCategoryKey = (e: any) =>
  String(e?.category?.name ?? "").trim().toLowerCase(); // "event" | "recurring" | "birthday"

const CategoryIcon = ({ e }: { e: any }) => {
  const key = getCategoryKey(e);
  console.log(e)
  const color = e.category?.color ?? COLORS.accentPink;

  if (key === "recurring") return <Briefcase size={18} color={color} />;
  if (key === "birthday") return <Cake size={18} color={color} />;
  // default = event
  return <Calendar size={18} color={color} />;
};

// =========================
// Component
// =========================
export default function Home() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [direction, setDirection] = useState(0);
  const [monthDots, setMonthDots] = useState<MonthDots>({});


  const navigate = useNavigate();
  const location = useLocation();

  // ✅ new: events state (minimal change)
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

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
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + (dir === "next" ? 1 : -1), 1));
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

  // ✅ new: read selected date from query param "d" on load/back/refresh
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const d = params.get("d");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, dd] = d.split("-").map(Number);
      const next = new Date(y, (m ?? 1) - 1, dd ?? 1);
      setSelectedDate(next);

      // keep month in sync if user lands on a different day
      const monthStart = startOfMonth(next);
      if (monthStart.getFullYear() !== currentMonth.getFullYear() || monthStart.getMonth() !== currentMonth.getMonth()) {
        setCurrentMonth(monthStart);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // ✅ new: fetch events for selected date (minimal behaviour change)
  useEffect(() => {
    const yyyyMmDd =
      `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    const controller = new AbortController();

    const run = async () => {
      setIsLoadingEvents(true);
      try {
        const res = await fetch(`${API_BASE}/api/events/retrieve-by-date?date=${encodeURIComponent(yyyyMmDd)}`, {
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to fetch events");
        setEvents(json?.events ?? []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    run();
    return () => controller.abort();
  }, [selectedDate]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const start = ymdFromLocalDate(startOfMonth(currentMonth));
        const end = ymdFromLocalDate(endOfMonth(currentMonth));

        const res = await fetch(
          `${API_BASE}/api/events/retrieve-month-dots?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
          { signal: controller.signal }
        );

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to fetch month dots");

        setMonthDots(json?.dots ?? {});
      } catch (e: any) {
        if (e?.name !== "AbortError") setMonthDots({});
      }
    };

    run();
    return () => controller.abort();
  }, [currentMonth]);


  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: COLORS.darkRed,
        color: COLORS.offWhite,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        pt: 5,
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
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <Typography key={d} fontSize={12} color={COLORS.offWhite}>
              {d}
            </Typography>
          ))}
        </Box>

        {/* Animated Calendar Grid */}
        <Box sx={{ position: "relative", height: GRID_H, overflow: "hidden" }}>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`} // ✅ stable key
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                position: "absolute",        // ✅ take out of document flow
                inset: 0,                    // top:0 left:0 right:0 bottom:0
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 8,
              }}
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
                      position: "relative",
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
                    <Typography
                      fontSize={14}
                      fontWeight={isSelected ? 600 : 400}
                      color={COLORS.offWhite}
                    >
                      {date.getDate()}
                    </Typography>
                    {/* ✅ month dots */}
                    {(() => {
                      const key = ymdFromLocalDate(date);
                      const dots = monthDots[key] ?? [];
                      if (!dots.length) return null;

                      return (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 3,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            gap: "3px",
                            alignItems: "center",
                            pointerEvents: "none",
                          }}
                        >
                          {dots.slice(0, 3).map((c) => (
                            <Box
                              key={c}
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                backgroundColor: c,
                              }}
                            />
                          ))}
                        </Box>
                      );
                    })()}
                  </Box>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </Box>



      </Paper>

      {/* ✅ new: event list (kept inside same Paper; no layout overhaul) */}
      <Box
        sx={{
          mt: '100%',
          backgroundColor: COLORS.offWhite,
          color: COLORS.offBlack,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          position: 'fixed',
          width: '100%',
          height: '100%'
        }}
      >
        <Typography fontWeight={600} sx={{ m: 3 }} fontSize={18}>
          {prettyDate(selectedDate)}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />

        {isLoadingEvents ? (
          <Typography fontSize={13} sx={{ color: COLORS.grey, m: 3 }}>
            Loading…
          </Typography>
        ) : events.length === 0 ? (
          <Typography fontSize={13} sx={{ color: COLORS.grey, m: 3 }}>
            No events for this day.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1, m: 2 }}>
            {events.map((e) => (
              <Box
                key={e.event_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  // justifyContent: "space-between",
                  gap: 1.25,
                  px: 1.25,
                  py: 1,
                  borderRadius: 3,
                }}
              >
                <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  <CategoryIcon e={e} />
                </Box>
                <Box sx={{ minWidth: 0, px: 2 }}>
                  <Typography fontWeight={800} fontSize={13} noWrap>
                    {e.title}
                  </Typography>
                  <Typography fontSize={12} sx={{ color: COLORS.grey }}>
                    {prettyTimeRange(e)}
                    {e.location ? ` • ${e.location}` : ""}
                  </Typography>
                  {e.description ? (
                    <Typography fontSize={12} sx={{ color: COLORS.grey }} noWrap>
                      {e.description}
                    </Typography>
                  ) : null}
                </Box>


              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
