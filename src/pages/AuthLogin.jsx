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
  const [noticesToShow, setNoticesToShow] = useState([]);
  const [noticeIndex, setNoticeIndex] = useState(0);

  const checkAndShowNotices = async () => {
    return false;
  };

  const handleNoticeConfirm = () => {
    if (noticeIndex < noticesToShow.length) {
      const current = noticesToShow[noticeIndex];
      localStorage.setItem(`sf_notice_seen_${current.id}`, 'true');
      if (noticeIndex + 1 < noticesToShow.length) {
        setNoticeIndex(noticeIndex + 1);
      } else {
        setNoticesToShow([]);
        navigate(Auth.getHomeRoute());
      }
    }
  };

  const getRoleLabel = (role, extraData) => {
    const roleMap = {
      'super_admin': '최고관리자',
      'dealer_admin': '딜러관리자',
      'call_admin': '콜관리자',
      'dealer': extraData?.grade ? `${extraData.grade}등급 딜러` : '딜러',
      'call_team': '콜팀',
      'manager': '매니저',
      'general_manager': '총괄매니저',
      'online_director': '온라인디렉터'
    };
    return roleMap[role] || role;
  };

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

      {noticesToShow.length > 0 && noticeIndex < noticesToShow.length && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-[#0a0c15] border border-blue-500/30 rounded-2xl max-w-lg w-full max-h-96 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-3">{noticesToShow[noticeIndex].title}</h2>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{noticesToShow[noticeIndex].content}</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/[0.06]">
              {noticeIndex + 1 < noticesToShow.length && (
                <span className="text-xs text-gray-500 self-center flex-1">공지 {noticeIndex + 1} / {noticesToShow.length}</span>
              )}
              <button
                onClick={handleNoticeConfirm}
                className="px-6 py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl font-semibold hover:bg-blue-500/30 transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}