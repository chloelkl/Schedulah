import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import eventsRoutes from "./routes/events.route.js";

import groupsRoutes from "./routes/groups.js";
import hangoutsRoutes from "./routes/hangouts.js";
import invitesRoutes from "./routes/invites.js";

import hangoutVotingRoutes from "./routes/hangoutVoting.js";

export const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, message: "Schedulah server is running" });
});

app.use("/auth", authRoutes);

// ✅ Mount your API routes here (BEFORE 404)
app.use("/api/groups", groupsRoutes); // /api/groups/:groupId
app.use("/api", hangoutsRoutes);      // /api/groups/:groupId/hangouts + /api/hangouts/:proposalId
app.use("/api", invitesRoutes);
app.use("/api", hangoutVotingRoutes);

app.use("/api/events", eventsRoutes);


// --- 404 handler ---
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: "Route not found" });
});

// --- Error handler (must be last) ---
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("❌ SERVER ERROR:", err);
  return res.status(500).json({
    ok: false,
    error: err?.message || "Internal server error",
    details: err?.details || undefined,
    hint: err?.hint || undefined,
    code: err?.code || undefined,
  });
});

