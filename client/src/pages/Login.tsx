import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import { supabase } from "../lib/supabaseClient";
import { COLORS } from "../constants/colors"; // if you have this

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      nav("/", { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: COLORS?.darkRed ?? "#3b0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 4,
          p: 3,
          bgcolor: "#f4f0eb",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Welcome back
        </Typography>
        <Typography sx={{ opacity: 0.75, mb: 2 }}>
          Log in to continue.
        </Typography>

        {errorMsg ? <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert> : null}

        <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 1.5 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              mt: 1,
              borderRadius: 999,
              py: 1.2,
              fontWeight: 800,
              bgcolor: COLORS?.accentPink ?? "#ec9daf",
              color: "#2b0b0b",
              "&:hover": { bgcolor: COLORS?.accentPink ?? "#ec9daf" },
            }}
          >
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
