import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";

const VALID_PREFIXES = ["admin_", "dealer_", "call_"];

export default function ProtectedRoute({ children, roles }) {
  // Session check every 5 minutes
  useEffect(() => {
    const checkSession = async () => {
      const storedToken = localStorage.getItem('sf_session_token');
      const storedId = localStorage.getItem('sf_session_id');
      const role = Auth.getRole();
      if (!storedToken || !storedId) return;
      try {
        let entity;
        if (role === 'dealer' || role === 'manager' || role === 'dealer_admin') {
          const dealers = await base44.entities.DealerInfo.list();
          entity = dealers.find(d => d.id === storedId);
        } else if (role === 'call_team' || role === 'call_admin') {
          const members = await base44.entities.CallTeamMember.list();
          entity = members.find(m => m.id === storedId);
        }
        if (entity && entity.session_token && entity.session_token !== storedToken) {
          Auth.logout();
          alert('다른 기기에서 로그인되어 자동 로그아웃됩니다.');
        }
      } catch (e) {
        console.warn('Session check failed', e);
      }
    };
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const token = Auth.getToken();
  const validToken = token && VALID_PREFIXES.some(p => token.startsWith(p));
  if (!validToken) {
    Auth.logout();
    return <Navigate to="/" replace />;
  }
  const currentRole = Auth.getRole();
  if (currentRole === 'super_admin' || currentRole === 'online_director') {
    return children;
  }
  if (roles && roles.length > 0 && !roles.includes(currentRole)) {
    return <Navigate to={Auth.getHomeRoute()} replace />;
  }

  return children;
}