import type { Request, Response } from "express";
import { supabase } from "../config/db.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: "Email and password are required",
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    return res.status(401).json({
      ok: false,
      error: "Invalid email or password",
    });
  }

  // Optional: fetch profile
  const { data: profile } = await supabase
    .from("app_user")
    .select("user_id, display_name, email, timezone")
    .eq("user_id", data.user.id)
    .single();

  return res.status(200).json({
    ok: true,
    user: profile,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
}
