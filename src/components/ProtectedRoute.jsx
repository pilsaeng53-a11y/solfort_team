import { Navigate } from "react-router-dom";
import { Auth } from "@/lib/auth";

const VALID_PREFIXES = ["admin_", "dealer_", "call_"];

export default function ProtectedRoute({ children, roles }) {

  const token = Auth.getToken();
  const validToken = token && (token.startsWith('dealer_') || token.startsWith('call_') || token.startsWith('admin_') || token.startsWith('online_') || token.startsWith('manager_'));
  if (!validToken) {
    Auth.logout();
    return <Navigate to="/" replace />;
  }
  const currentRole = Auth.getRole();
  if (roles && roles.length > 0 && !roles.includes(currentRole)) {
    return <Navigate to={Auth.getHomeRoute()} replace />;
  }

  return children;
}