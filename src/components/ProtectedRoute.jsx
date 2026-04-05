import { Navigate } from "react-router-dom";
import { Auth } from "@/lib/auth";

const VALID_PREFIXES = ["admin_", "dealer_", "call_"];

export default function ProtectedRoute({ children, roles }) {
  const token = Auth.getToken();
  const validToken = token && VALID_PREFIXES.some(p => token.startsWith(p));
  if (!validToken) {
    Auth.logout();
    return <Navigate to="/" replace />;
  }
  if (roles && roles.length > 0 && !roles.includes(Auth.getRole())) {
    return <Navigate to={Auth.getHomeRoute()} replace />;
  }
  return children;
}