import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Auth } from "@/lib/auth";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SFLogo from "../components/SFLogo";

export default function AuthLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("아이디와 비밀번호를 입력하세요");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://solfort-js.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.token) {
        Auth.login(data);
        navigate(Auth.getHomeRoute());
        setLoading(false);
        return;
      }
    } catch {}
    // Fallback: Base44 entity lookup
    const dealers = await base44.entities.DealerInfo.filter({ username, status: 'active' });
    const dealer = dealers.find(d => d.password === password);
    if (dealer) {
      Auth.login({ token: 'local_' + dealer.id, role: 'dealer', dealer_name: dealer.dealer_name, user_id: dealer.id });
      navigate(Auth.getHomeRoute());
      setLoading(false);
      return;
    }
    const callMembers = await base44.entities.CallTeamMember.filter({ username, status: 'active' });
    const callMember = callMembers.find(c => c.password === password);
    if (callMember) {
      Auth.login({ token: 'local_' + callMember.id, role: 'call_team', dealer_name: callMember.name, user_id: callMember.id });
      navigate(Auth.getHomeRoute());
      setLoading(false);
      return;
    }
    setError("아이디 또는 비밀번호가 올바르지 않습니다");
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <SFLogo size="lg" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">SolFort</h1>
            <p className="text-sm text-gray-500 mt-1">통합 운영 시스템</p>
          </div>
        </div>

        {/* Form */}
        <div className="sf-card rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-400">아이디</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKey}
              placeholder="아이디 입력"
              className="bg-white/5 border-white/10 text-white rounded-xl h-11"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400">비밀번호</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              placeholder="비밀번호 입력"
              className="bg-white/5 border-white/10 text-white rounded-xl h-11"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full sf-gradient-btn rounded-xl text-white border-0 h-12 font-semibold"
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600">
        계정이 없으신가요?{" "}
        <Link to="/register" className="text-gray-400 hover:text-white underline">회원가입</Link>
      </p>
    </div>
  );
}