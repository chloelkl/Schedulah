import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { JSX } from "react";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null; // or your loader component
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  return children;
}
