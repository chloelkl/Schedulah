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

router.post("/add-recurring", async (req, res) => {
  try {
    const user_id = process.env.HOST_USER_ID as string;

    const {
      title,
      description,
      location,
      date,              // start date anchor (yyyy-mm-dd)
      start_at,
      end_at,
      category_name,
      recurrence,        // { rrule, until_at, count }
    } = req.body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Start date is required" });
    }

    const normalizedCategory = String(category_name ?? "").trim().toLowerCase();
    if (normalizedCategory !== "recurring") {
      return res.status(400).json({ error: "Category must be recurring" });
    }

    // recurrence validation
    const rrule = recurrence?.rrule;
    const until_at = recurrence?.until_at ?? null;
    const count = recurrence?.count ?? null;

    if (!rrule || typeof rrule !== "string") {
      return res.status(400).json({ error: "recurrence.rrule is required" });
    }
    if (until_at !== null && typeof until_at !== "string") {
      return res.status(400).json({ error: "recurrence.until_at must be a string or null" });
    }
    if (count !== null && typeof count !== "number") {
      return res.status(400).json({ error: "recurrence.count must be a number or null" });
    }

    const computedAllDay = (!start_at && !end_at);

    // 1) Insert event (base row)
    const insertEvent = {
      user_id,
      title: title.trim(),
      description: description ?? null,
      location: location ?? null,  // ✅ keep
      date,
      start_at: start_at ?? null,
      end_at: end_at ?? null,
      all_day: computedAllDay,

      visibility: "private",
      busy_status: "busy",
      source: "manual",
      final_event_id: null,
    };

    const { data: eventRow, error: eventErr } = await supabaseAdmin
      .from("event")
      .insert(insertEvent)
      .select("event_id,*")
      .single();

    if (eventErr || !eventRow) {
      return res.status(500).json({ error: eventErr?.message ?? "Failed to create recurring event" });
    }

    const event_id = eventRow.event_id as string;

    // 2) Find category_id for "recurring"
    const { data: catRow, error: catErr } = await supabaseAdmin
      .from("event_category")
      .select("category_id")
      .ilike("name", "recurring")
      .maybeSingle();

    if (catErr || !catRow?.category_id) {
      await supabaseAdmin.from("event").delete().eq("event_id", event_id);
      return res.status(500).json({ error: "Category recurring not found in event_category" });
    }

    const category_id = catRow.category_id;

    // 3) Map event -> category
    const { error: mapErr } = await supabaseAdmin
      .from("event_category_map")
      .insert({ event_id, category_id });

    if (mapErr) {
      await supabaseAdmin.from("event").delete().eq("event_id", event_id);
      return res.status(500).json({ error: mapErr.message });
    }

    // 4) Insert recurrence row
    const { error: recErr } = await supabaseAdmin
      .from("event_recurrence")
      .insert({
        event_id,
        rrule,
        until_at, // store as string (match your model) or change column to date/timestamptz later
        count,
      });

    if (recErr) {
      // rollback everything so no orphan event exists
      await supabaseAdmin.from("event_category_map").delete().eq("event_id", event_id);
      await supabaseAdmin.from("event").delete().eq("event_id", event_id);
      return res.status(500).json({ error: recErr.message });
    }

    return res.status(201).json({
      event: eventRow,
      category_id,
      recurrence: { event_id, rrule, until_at, count },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

router.get("/retrieve-by-date", async (req, res) => {
  try {
    const user_id = process.env.HOST_USER_ID as string;
    const date = String(req.query.date ?? "").trim(); // YYYY-MM-DD

    if (!user_id) return res.status(500).json({ error: "HOST_USER_ID is not set" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    // 1) events on that date
    const { data: events, error: evErr } = await supabaseAdmin
      .from("event")
      .select("event_id,title,description,location,date,start_at,end_at,all_day,created_at")
      .eq("user_id", user_id)
      .eq("date", date)
      .order("start_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (evErr) return res.status(500).json({ error: evErr.message });

    const eventIds = (events ?? []).map((e) => e.event_id);
    if (eventIds.length === 0) return res.status(200).json({ events: [] });

    // 2) maps -> category ids
    const { data: maps, error: mapErr } = await supabaseAdmin
      .from("event_category_map")
      .select("event_id,category_id")
      .in("event_id", eventIds);

    if (mapErr) return res.status(500).json({ error: mapErr.message });

    const catIds = Array.from(new Set((maps ?? []).map((m) => m.category_id)));
    const { data: cats, error: catErr } = await supabaseAdmin
      .from("event_category")
      .select("category_id,name,color")
      .in("category_id", catIds);

    if (catErr) return res.status(500).json({ error: catErr.message });

    const catById = new Map((cats ?? []).map((c) => [c.category_id, c]));
    const catIdByEventId = new Map((maps ?? []).map((m) => [m.event_id, m.category_id]));

    const enriched = (events ?? []).map((e) => {
      const category_id = catIdByEventId.get(e.event_id) ?? null;
      const cat = category_id ? catById.get(category_id) : null;
      return {
        ...e,
        category: cat
          ? { category_id: cat.category_id, name: cat.name, color: cat.color }
          : null,
      };
    });

    return res.status(200).json({ events: enriched });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});


export default router;
