import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@/lib/auth";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SFLogo from "../components/SFLogo";
import { toast } from "sonner";

export default function AuthLogin() {
  useEffect(() => { document.title = "SolFort - 로그인"; }, []);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("아이디와 비밀번호를 입력하세요");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await api.post('/api/auth/login', { username, password });
      localStorage.setItem('sf_token', result.token);
      localStorage.setItem('sf_user', JSON.stringify(result.user));

      const roleNavigateMap = {
        'super_admin': '/admin/super',
        'dealer_admin': '/admin/dealer',
        'call_admin': '/admin/call',
        'dealer': '/',
        'call_team': '/call/dashboard',
        'online_team': '/online/dashboard',
        'manager': '/manager',
        'online_director': '/online-director'
      };

      const path = roleNavigateMap[result.user.role] || '/';
      toast(`환영합니다, ${result.user.name || result.user.username}님!`);
      navigate(path);
    } catch (err) {
      setError(err.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
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
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <div className="text-center">
              <span className="text-sm text-gray-500">계정이 없으신가요? </span>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-sm text-blue-400 hover:text-blue-300 font-semibold"
              >
                회원가입
              </button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-gray-500 hover:text-gray-300 font-medium"
              >
                아이디/비밀번호를 잊으셨나요?
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-[#0a0c15] border border-white/[0.06] rounded-2xl p-6 max-w-sm text-center space-y-4">
            <h2 className="text-lg font-bold text-white">비밀번호 찾기</h2>
            <p className="text-sm text-gray-400">관리자에게 문의하세요.\n텔레그램: @solfort_admin</p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold hover:bg-emerald-500/30 transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}


    </div>
  );
}