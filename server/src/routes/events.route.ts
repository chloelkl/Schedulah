import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { requireSupabaseUser } from "../middleware/requireSupabaseUser.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { RRule } = require("rrule")


const router = Router();

// --- Singapore day window (explicit +08:00) ---
function dayStartSG(dateYmd: string) {
  return new Date(`${dateYmd}T00:00:00+08:00`);
}
function dayEndExclusiveSG(dateYmd: string) {
  const d = new Date(`${dateYmd}T00:00:00+08:00`);
  d.setDate(d.getDate() + 1);
  return d;
}

// Build DTSTART from anchor event.date + start_at (HH:mm) in SG
function buildDtStartSG(anchorYmd: string, startAt?: string | null) {
  const time =
    startAt && typeof startAt === "string" && startAt.trim()
      ? startAt.trim()
      : "00:00";

  const [hh = 0, mm = 0, ss = 0] = time.split(":").map(Number);
  const H = String(Number.isFinite(hh) ? hh : 0).padStart(2, "0");
  const M = String(Number.isFinite(mm) ? mm : 0).padStart(2, "0");
  const S = String(Number.isFinite(ss) ? ss : 0).padStart(2, "0");

  return new Date(`${anchorYmd}T${H}:${M}:${S}+08:00`);
}

// ✅ Robust until_at parsing + SG inclusive heuristic
function parseUntilSGInclusive(until_at: unknown): Date | null {
  if (!until_at) return null;

  const raw = String(until_at).trim();

  // If it looks like your sample: "YYYY-MM-DD 00:00:00+00"
  // Treat as "until that DATE inclusive in Singapore"
  // => end of that SG day: YYYY-MM-DDT23:59:59+08:00
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})\s+00:00:00\+00$/);
  if (m) {
    const ymd = m[1];
    return new Date(`${ymd}T23:59:59+08:00`);
  }

  // Otherwise: make it ISO-ish and parse
  // e.g. "2026-02-24 13:00:00+00" -> "2026-02-24T13:00:00+00"
  const isoish = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function pickCategory(ev: any) {
  const cat = ev?.event_category_map?.[0]?.event_category ?? null;
  if (!cat) return null;
  return {
    category_id: cat.category_id ?? null,
    name: cat.name ?? null,
    color: cat.color ?? null,
  };
}

function normalizeRRule(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .replace(/\r/g, "")
    .replace(/^RRULE:/i, "")
    .trim();
}

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

    // ----------------------------
    // 1) Base events on that date
    // ----------------------------
    const { data: baseEvents, error: baseErr } = await supabaseAdmin
      .from("event")
      .select(`
        event_id,title,description,location,date,start_at,end_at,all_day,created_at,
        event_category_map(
          event_category(category_id,name,color)
        )
      `)
      .eq("user_id", user_id)
      .eq("date", date)
      .order("start_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (baseErr) return res.status(500).json({ error: baseErr.message });

    const baseEnriched = (baseEvents ?? []).map((e: any) => ({
      event_id: e.event_id,
      title: e.title,
      description: e.description,
      location: e.location,
      date: e.date,
      start_at: e.start_at,
      end_at: e.end_at,
      all_day: e.all_day,
      created_at: e.created_at,
      category: pickCategory(e),
      source: "base",
    }));

    // ----------------------------
    // 2) Fetch recurrence rows (NO JOIN FILTERS)
    // ----------------------------
    const { data: recRows, error: recErr } = await supabaseAdmin
      .from("event_recurrence")
      .select("event_id, rrule, until_at, count");



    if (recErr) return res.status(500).json({ error: recErr.message });

    const recEventIds = Array.from(
      new Set((recRows ?? []).map((r: any) => r.event_id).filter(Boolean))
    );

    if (recEventIds.length === 0) {
      return res.status(200).json({ events: baseEnriched });
    }

    // ----------------------------
    // 3) Fetch anchor events for those recurrences (FILTER BY USER HERE)
    // ----------------------------
    const { data: recEvents, error: evErr } = await supabaseAdmin
      .from("event")
      .select(`
        event_id,user_id,title,description,location,date,start_at,end_at,all_day,created_at,
        event_category_map(
          event_category(category_id,name,color)
        )
      `)
      .eq("user_id", user_id)
      .in("event_id", recEventIds);


    if (evErr) return res.status(500).json({ error: evErr.message });

    const eventById = new Map((recEvents ?? []).map((e: any) => [e.event_id, e]));

    // ----------------------------
    // 4) Expand occurrences for requested SG date
    // ----------------------------
    const from = dayStartSG(date);
    const to = dayEndExclusiveSG(date);

    const recurringOccurrences: any[] = [];

    for (const r of recRows ?? []) {
      const ev = eventById.get((r as any).event_id);
      if (!ev) continue; // not this user, or deleted

      const dtstart = buildDtStartSG(String(ev.date), ev.start_at);
      const ruleStr = normalizeRRule((r as any).rrule);
      if (!ruleStr) continue;

      let rule: any;
      try {

        const parsed = RRule.parseString(ruleStr);

        const opts: any = { ...parsed, dtstart };

        const until = parseUntilSGInclusive((r as any).until_at);

        if (!opts.until && until) opts.until = until;
        if (!opts.count && typeof (r as any).count === "number") opts.count = (r as any).count;


        rule = new RRule(opts);
      } catch (err: any) {
        console.error("RRULE BUILD ERROR:", err?.message ?? err);
        console.error("RRULE BUILD ERROR (full):", err);
        continue;
      }

      const occ = rule.between(from, to, true);
      if (!occ.length) continue;

      recurringOccurrences.push({
        event_id: ev.event_id,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        date, // override to requested date
        start_at: ev.start_at,
        end_at: ev.end_at,
        all_day: ev.all_day,
        created_at: ev.created_at,
        category: pickCategory(ev),
        source: "recurring",
        occurrence_at: occ[0].toISOString(), // helpful for debugging/UI
      });
    }

    // ----------------------------
    // 5) Merge + sort
    // ----------------------------
    const merged = [...baseEnriched, ...recurringOccurrences];

    merged.sort((a, b) => {
      const aAll = a.all_day ? 1 : 0;
      const bAll = b.all_day ? 1 : 0;
      if (aAll !== bAll) return bAll - aAll;

      const aTime = String(a.start_at ?? "");
      const bTime = String(b.start_at ?? "");
      if (aTime !== bTime) return aTime.localeCompare(bTime);

      return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
    });

    return res.status(200).json({ events: merged });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

router.get("/retrieve-month-dots", async (req, res) => {
  try {
    const user_id = process.env.HOST_USER_ID as string;

    const start = String(req.query.start ?? "").trim(); // YYYY-MM-DD
    const end = String(req.query.end ?? "").trim();     // YYYY-MM-DD

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return res.status(400).json({ error: "start/end must be YYYY-MM-DD" });
    }

    const { data: events, error: evErr } = await supabaseAdmin
      .from("event")
      .select("event_id,date")
      .eq("user_id", user_id)
      .gte("date", start)
      .lte("date", end);

    if (evErr) return res.status(500).json({ error: evErr.message });
    const eventIds = (events ?? []).map((e) => e.event_id);
    if (!eventIds.length) return res.status(200).json({ dots: {} });

    const { data: maps, error: mapErr } = await supabaseAdmin
      .from("event_category_map")
      .select("event_id,category_id")
      .in("event_id", eventIds);

    if (mapErr) return res.status(500).json({ error: mapErr.message });

    const catIds = Array.from(new Set((maps ?? []).map((m) => m.category_id)));
    const { data: cats, error: catErr } = await supabaseAdmin
      .from("event_category")
      .select("category_id,color")
      .in("category_id", catIds);

    if (catErr) return res.status(500).json({ error: catErr.message });

    const colorByCat = new Map((cats ?? []).map((c) => [c.category_id, c.color]));
    const catByEvent = new Map((maps ?? []).map((m) => [m.event_id, m.category_id]));

    const dots: Record<string, string[]> = {};

    for (const ev of events ?? []) {
      const catId = catByEvent.get(ev.event_id);
      if (!catId) continue;

      const color = colorByCat.get(catId) ?? null;
      if (!color) continue;

      const key = ev.date as string;

      if (!dots[key]) dots[key] = [];
      if (!dots[key].includes(color)) dots[key].push(color); // ✅ 1 per colour
    }

    return res.status(200).json({ dots });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});


export default router;
