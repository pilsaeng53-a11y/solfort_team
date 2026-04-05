import { Navigate } from "react-router-dom";
import { Auth } from "@/lib/auth";

export default function ProtectedRoute({ children, roles }) {
  if (!Auth.isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  if (roles && roles.length > 0 && !roles.includes(Auth.getRole())) {
    return <Navigate to={Auth.getHomeRoute()} replace />;
  }
  return children;
}