import { Navigate } from "react-router-dom";
import { getToken, isAdmin } from "@/lib/api";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/hub" replace />;
  return <>{children}</>;
}
