import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = 'https://solfort-api-9red.onrender.com';
const ROUTES = {'super_admin':'/admin/super','dealer_admin':'/admin/dealer','call_admin':'/admin/call','dealer':'/dashboard','call_team':'/call/dashboard','online_team':'/online/dashboard','manager':'/manager','online_director':'/online-director'};

export default function AuthLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "SolFort - 로그인";
    const t = localStorage.getItem('sf_token');
    const u = localStorage.getItem('sf_user');
    if (t && u) {
      try { const user = JSON.parse(u); navigate(ROUTES[user.role]||'/dashboard', {replace:true}); } catch {}
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) { setError("아이디와 비밀번호를 입력하세요"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(API + '/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({username, password})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '로그인 실패');
      localStorage.setItem('sf_token', data.token);
      localStorage.setItem('sf_user', JSON.stringify(data.user));
      localStorage.setItem('sf_role', data.user.role);
      localStorage.setItem('sf_user_id', data.user.id);
      navigate(ROUTES[data.user.role]||'/dashboard', {replace:true});
    } catch(err) {
      setError(err.message || '로그인 실패');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">SF</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SolFort</h1>
          <p className="text-sm text-gray-500">통합 운영 시스템</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div><label className="text-xs text-gray-400">아이디</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              placeholder="아이디 입력" className="w-full mt-1 px-4 h-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-emerald-500" /></div>
          <div><label className="text-xs text-gray-400">비밀번호</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              placeholder="비밀번호 입력" className="w-full mt-1 px-4 h-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-emerald-500" /></div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-semibold text-sm disabled:opacity-60">
            {loading ? "로그인 중..." : "로그인"}
          </button>
          <div className="text-center">
            <span className="text-sm text-gray-500">계정이 없으신가요? </span>
            <button onClick={()=>navigate('/register')} className="text-sm text-blue-400 font-semibold">회원가입</button>
          </div>
        </div>
      </div>
    </div>
  );
}