import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@/lib/auth";
import { base44 } from "@/api/base44Client";
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
    try {
      const notices = await base44.entities.Notice.list('-created_at', 100);
      const now = new Date().toISOString();
      const important = notices.filter(n => n.is_important === true && n.expires_at && n.expires_at > now);
      const unseen = important.filter(n => !localStorage.getItem(`sf_notice_seen_${n.id}`));
      if (unseen.length > 0) {
        setNoticesToShow(unseen);
        setNoticeIndex(0);
        return true;
      }
    } catch {}
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
    const LOCK_KEY = 'sf_login_lock';
    const FAIL_KEY = 'sf_login_fails';

    if (!username || !password) {
      setError("아이디와 비밀번호를 입력하세요");
      return;
    }

    // Check login lockout
    const lockUntil = localStorage.getItem(LOCK_KEY);
    if (lockUntil && Date.now() < parseInt(lockUntil)) {
      const mins = Math.ceil((parseInt(lockUntil) - Date.now()) / 60000);
      setError(`로그인이 잠겼습니다. ${mins}분 후 다시 시도하세요.`);
      return;
    }

    setLoading(true);
    setError("");

    // 1. SuperAdmin 체크
    const admins = await base44.entities.SuperAdmin.list();
    const admin = admins.find(a => a.username === username && a.password === password && a.status === 'active');
    if (admin) {
      if (admin.status === 'dormant') {
        setError('휴면 계정입니다. 관리자에게 문의하세요.');
        setLoading(false);
        return;
      }
      const sessionToken = Date.now() + '_' + Math.random().toString(36).slice(2);
      localStorage.setItem('sf_session_token', sessionToken);
      localStorage.setItem('sf_session_id', admin.id);
      localStorage.removeItem(FAIL_KEY);
      localStorage.removeItem(LOCK_KEY);
      Auth.login({ token: 'admin_' + admin.id, role: 'super_admin', dealer_name: admin.name, user_id: admin.id });
      toast(`환영합니다, ${getRoleLabel('super_admin')} ${admin.name}님!`);
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipRes.json();
        await base44.entities.SystemLog.create({
          log_type: 'login',
          actor: username,
          actor_role: 'super_admin',
          target: username,
          action: '로그인 성공 - IP: ' + ip,
          after_value: ip,
          ip_address: ip,
          created_at: new Date().toISOString()
        });
      } catch(e) { }
      const hasNotices = await checkAndShowNotices();
      if (!hasNotices) {
        navigate(Auth.getHomeRoute());
      }
      setLoading(false);
      return;
    }

    // 2. DealerInfo 체크
    const dealers = await base44.entities.DealerInfo.list();
    const dealer = dealers.find(d => d.username === username && d.password === password);
    if (dealer) {
      if (dealer.status === 'dormant') {
        setError('휴면 계정입니다. 관리자에게 문의하세요.');
        setLoading(false);
        return;
      }
      if (dealer.status !== 'active') {
        const fails = parseInt(localStorage.getItem(FAIL_KEY) || '0') + 1;
        localStorage.setItem(FAIL_KEY, String(fails));
        if (fails >= 5) {
          localStorage.setItem(LOCK_KEY, String(Date.now() + 10 * 60 * 1000));
          localStorage.removeItem(FAIL_KEY);
          setError('로그인 5회 실패. 10분간 잠금됩니다.');
        } else {
          setError(`아이디 또는 비밀번호가 올바르지 않습니다. (${fails}/5)`);
        }
        setLoading(false);
        return;
      }
      const sessionToken = Date.now() + '_' + Math.random().toString(36).slice(2);
      const currentTime = new Date().toISOString();
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip: currentIP } = await ipRes.json();
        const lastIP = dealer.last_login_ip;
        const updateData = { session_token: sessionToken, last_login_at: currentTime, last_login_ip: currentIP };
        await base44.entities.DealerInfo.update(dealer.id, updateData);
        if (lastIP && lastIP !== currentIP) {
          const msg = `⚠️ 새로운 IP 접속 감지\n계정: ${username}\n이전IP: ${lastIP}\n새IP: ${currentIP}\n시각: ${currentTime}`;
          fetch('https://api.telegram.org/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: '5757341051', text: msg })
          }).catch(() => {});
        }
      } catch(e) {
        await base44.entities.DealerInfo.update(dealer.id, { session_token: sessionToken, last_login_at: currentTime });
      }
      localStorage.setItem('sf_session_token', sessionToken);
      localStorage.setItem('sf_session_id', dealer.id);
      localStorage.removeItem(FAIL_KEY);
      localStorage.removeItem(LOCK_KEY);
      Auth.login({ token: 'dealer_' + dealer.id, role: dealer.role || 'dealer', dealer_name: dealer.dealer_name, user_id: dealer.id, region_scope: dealer.region_scope || '' });
      toast(`환영합니다, ${getRoleLabel(dealer.role || 'dealer', { grade: dealer.grade })} ${dealer.dealer_name}님!`);
      if (dealer.role === 'manager') {
        localStorage.setItem('sf_assigned_dealer', dealer.assigned_dealer || '');
      }
      if (dealer.role === 'general_manager') {
        localStorage.setItem('sf_assigned_dealer', dealer.assigned_dealer || '');
      }
      if (dealer.role === 'general_manager') { navigate('/manager'); setLoading(false); return; }
      if (dealer.role === 'online_director') { navigate('/online-director'); setLoading(false); return; }
      const hasNotices = await checkAndShowNotices();
      if (!hasNotices) {
        navigate(Auth.getHomeRoute());
      }
      setLoading(false);
      return;
    }

    // 3. CallTeamMember 체크
    const callMembers = await base44.entities.CallTeamMember.list();
    const member = callMembers.find(m => m.username === username && m.password === password);
    if (member) {
      if (member.status === 'dormant') {
        setError('휴면 계정입니다. 관리자에게 문의하세요.');
        setLoading(false);
        return;
      }
      if (member.status !== 'active') {
        const fails = parseInt(localStorage.getItem(FAIL_KEY) || '0') + 1;
        localStorage.setItem(FAIL_KEY, String(fails));
        if (fails >= 5) {
          localStorage.setItem(LOCK_KEY, String(Date.now() + 10 * 60 * 1000));
          localStorage.removeItem(FAIL_KEY);
          setError('로그인 5회 실패. 10분간 잠금됩니다.');
        } else {
          setError(`아이디 또는 비밀번호가 올바르지 않습니다. (${fails}/5)`);
        }
        setLoading(false);
        return;
      }
      const sessionToken = Date.now() + '_' + Math.random().toString(36).slice(2);
      const currentTime = new Date().toISOString();
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip: currentIP } = await ipRes.json();
        const lastIP = member.last_login_ip;
        const updateData = { session_token: sessionToken, last_login_at: currentTime, last_login_ip: currentIP };
        await base44.entities.CallTeamMember.update(member.id, updateData);
        if (lastIP && lastIP !== currentIP) {
          const msg = `⚠️ 새로운 IP 접속 감지\n계정: ${username}\n이전IP: ${lastIP}\n새IP: ${currentIP}\n시각: ${currentTime}`;
          fetch('https://api.telegram.org/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: '5757341051', text: msg })
          }).catch(() => {});
        }
      } catch(e) {
        await base44.entities.CallTeamMember.update(member.id, { session_token: sessionToken, last_login_at: currentTime });
      }
      localStorage.setItem('sf_session_token', sessionToken);
      localStorage.setItem('sf_session_id', member.id);
      localStorage.removeItem(FAIL_KEY);
      localStorage.removeItem(LOCK_KEY);
      Auth.login({ token: 'call_' + member.id, role: member.role || 'call_team', dealer_name: member.name, user_id: member.id });
      toast(`환영합니다, ${getRoleLabel(member.role || 'call_team')} ${member.name}님!`);
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipRes.json();
        await base44.entities.SystemLog.create({
          log_type: 'login',
          actor: username,
          actor_role: member.role || 'call_team',
          target: username,
          action: '로그인 성공 - IP: ' + ip,
          ip_address: ip,
          created_at: new Date().toISOString()
        });
      } catch(e) { }
      const hasNotices = await checkAndShowNotices();
      if (!hasNotices) {
        navigate(Auth.getHomeRoute());
      }
      setLoading(false);
      return;
    }

    // Login failure
    const fails = parseInt(localStorage.getItem(FAIL_KEY) || '0') + 1;
    localStorage.setItem(FAIL_KEY, String(fails));
    if (fails >= 5) {
      localStorage.setItem(LOCK_KEY, String(Date.now() + 10 * 60 * 1000));
      localStorage.removeItem(FAIL_KEY);
      setError('로그인 5회 실패. 10분간 잠금됩니다.');
    } else {
      setError(`아이디 또는 비밀번호가 올바르지 않습니다. (${fails}/5)`);
    }
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