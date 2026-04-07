import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem('sf_token');
  const userStr = localStorage.getItem('sf_user');
  if (!token || !userStr) return <Navigate to="/" replace />;
  let user;
  try { user = JSON.parse(userStr); } catch { return <Navigate to="/" replace />; }
  if (!user || !user.role) return <Navigate to="/" replace />;
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    const r = {'super_admin':'/admin/super','dealer_admin':'/admin/dealer','call_admin':'/admin/call','dealer':'/dashboard','call_team':'/call/dashboard','online_team':'/online/dashboard','manager':'/manager','online_director':'/online-director'};
    return <Navigate to={r[user.role]||'/'} replace />;
  }
  return children;
}