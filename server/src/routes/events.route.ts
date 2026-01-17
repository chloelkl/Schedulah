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
      category_name
    } = req.body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date is required" });
    }
    if (!["event", "recurring", "birthday"].includes(category_name.toLowerCase())) {
      return res.status(400).json({ error: "Unknown category" });
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

    const { data: eventRow, error: eventErr } = await supabaseAdmin
      .from("event")
      .insert(insertRow)
      .select("event_id,*")
      .single();

    if (eventErr || !eventRow) {
      return res.status(500).json({ error: eventErr?.message ?? "Failed to create event" });
    }

    const event_id = eventRow.event_id as string;

    // 2) Look up name by name (seeded in DB)
    const normalized = String(category_name ?? "").trim().toLowerCase();

    const { data: catRow, error: catErr } = await supabaseAdmin
      .from("event_category")
      .select("category_id")
      .ilike("name", normalized)
      .maybeSingle();


    if (catErr || !catRow?.category_id) {
      // rollback event so you don't get orphan events
      await supabaseAdmin.from("event").delete().eq("event_id", event_id);
      return res.status(500).json({ error: "Category not found in eventcategory table" });
    }

    const category_id = catRow.category_id;

    // 3) Insert mapping
    const { error: mapErr } = await supabaseAdmin
      .from("event_category_map")
      .insert({ event_id, category_id });

    if (mapErr) {
      // rollback event
      await supabaseAdmin.from("event").delete().eq("event_id", event_id);
      return res.status(500).json({ error: mapErr.message });
    }

    return res.status(201).json({
      event: eventRow,
      category_id,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

export default router;
