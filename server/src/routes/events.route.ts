import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { requireSupabaseUser } from "../middleware/requireSupabaseUser.js";

const router = Router();


router.post("/add", async (req, res) => {
  try {
    // const user = (req as any).user;
    const user_id = process.env.HOST_USER_ID as string;

    const {
      title,
      description,
      location,
      date,
      start_at,
      end_at,
    } = req.body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date is required" });
    }

    // all_day rule: true if both empty/null
    const computedAllDay = (!start_at && !end_at);

    const insertRow = {
      user_id,
      title: title.trim(),
      description: description ?? null,
      location: location ?? null,
      date, // yyyy-mm-dd
      start_at: start_at ?? null, // HH:mm or null
      end_at: end_at ?? null,     // HH:mm or null
      all_day: computedAllDay,

      visibility: "private",
      busy_status: "busy",
      source: "manual",
      final_event_id: null,
    };

    const { data, error } = await supabaseAdmin
      .from("event")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ event: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

export default router;
