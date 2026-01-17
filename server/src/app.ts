import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";

// If you already have route files, you can import them like this:
// import apiRoutes from "./routes/index.js";

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


// If you have routes folder ready, use this instead:
// app.use("/api", apiRoutes);

// --- 404 handler ---
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: "Route not found" });
});

// --- Error handler (must be last) ---
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

