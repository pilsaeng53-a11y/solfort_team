import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SFLogo from "../components/SFLogo";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const INITIAL_DEALER = { username: "", password: "", confirm: "", dealer_name: "", owner_name: "", phone: "", region: "", referral_code: "" };
const INITIAL_CALL = { username: "", password: "", confirm: "", name: "", phone: "", team: "", employee_id: "" };

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'

  useEffect(() => { document.title = "SolFort - 회원가입"; }, []);

  const set = (key) => (e) => {
    const val = key === "phone" ? formatPhone(e.target.value) : e.target.value;
    setForm(p => ({ ...p, [key]: val }));
    if (key === "username") setUsernameStatus(null);
  };

  const selectRole = (r) => {
    setRole(r);
    setForm(r === "dealer" ? INITIAL_DEALER : INITIAL_CALL);
    setStep(2);
    setUsernameStatus(null);
  };

  const checkUsername = async () => {
    const u = form.username?.trim();
    if (!u) return;
    setUsernameStatus("checking");
    const [admins, dealers, callMembers] = await Promise.all([
      base44.entities.SuperAdmin.list(),
      base44.entities.DealerInfo.list(),
      base44.entities.CallTeamMember.list(),
    ]);
    const taken = [...admins, ...dealers, ...callMembers].some(x => x.username === u);
    setUsernameStatus(taken ? "taken" : "available");
  };

  const validate = () => {
    if (!form.username || !form.password || !form.confirm) return "필수 항목을 모두 입력하세요";
    if (!/^[a-zA-Z0-9]+$/.test(form.username)) return "아이디는 영문+숫자만 사용 가능합니다";
    if (usernameStatus === "taken") return "이미 사용 중인 아이디입니다";
    if (form.password.length < 6) return "비밀번호는 6자 이상이어야 합니다";
    if (form.password !== form.confirm) return "비밀번호가 일치하지 않습니다";
    if (role === "dealer") {
      if (!form.dealer_name || !form.owner_name || !form.phone || !form.region) return "필수 항목을 모두 입력하세요";
    } else {
      if (!form.name || !form.phone || !form.team) return "필수 항목을 모두 입력하세요";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    if (role === "dealer") {
      await base44.entities.DealerInfo.create({
        dealer_name: form.dealer_name, owner_name: form.owner_name, phone: form.phone,
        region: form.region, grade: "GREEN", username: form.username, password: form.password,
        role: "dealer", status: "pending", referral_code: form.referral_code || "",
      });
    } else {
      await base44.entities.CallTeamMember.create({
        username: form.username, password: form.password, name: form.name,
        phone: form.phone, team: form.team, employee_id: form.employee_id || "",
        role: "call_team", status: "pending",
      });
    }
    setLoading(false);
    setSuccess(true);
  };

  const accentBtn = role === "call_team" ? "bg-emerald-600 hover:bg-emerald-500 text-white border-0" : "sf-gradient-btn text-white border-0";

  if (success) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="sf-card rounded-2xl p-8 text-center space-y-5">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">가입 신청이 완료되었습니다!</h2>
              <p className="text-sm text-gray-400 mt-2">관리자 승인 후 로그인 가능합니다.</p>
            </div>
            <Button onClick={() => navigate("/")} className="w-full sf-gradient-btn text-white border-0 h-12 rounded-xl font-semibold">
              로그인 페이지로 이동
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const Field = ({ label, fkey, placeholder, type = "text", required = false, suffix = null }) => (
    <div>
      <label className="text-xs text-gray-400">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative mt-1">
        <Input type={type} value={form[fkey] || ""} onChange={set(fkey)} placeholder={placeholder}
          className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm" />
        {suffix && <div className="absolute right-2 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <SFLogo size="lg" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">SolFort 회원가입</h1>
            <p className="text-sm text-gray-500 mt-1">통합 운영 시스템</p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center">가입 유형을 선택하세요</p>
            <button onClick={() => selectRole("dealer")}
              className="w-full sf-card rounded-2xl p-5 text-left hover:border-blue-500/30 border border-transparent transition-all group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl shrink-0">🏪</div>
                <div>
                  <p className="text-white font-semibold group-hover:text-blue-400 transition-colors">대리점 가입</p>
                  <p className="text-xs text-gray-500 mt-1">SOL Fort 공식 대리점으로 등록</p>
                </div>
              </div>
            </button>
            <button onClick={() => selectRole("call_team")}
              className="w-full sf-card rounded-2xl p-5 text-left hover:border-emerald-500/30 border border-transparent transition-all group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl shrink-0">📞</div>
                <div>
                  <p className="text-white font-semibold group-hover:text-emerald-400 transition-colors">콜영업팀 가입</p>
                  <p className="text-xs text-gray-500 mt-1">콜영업팀 직원으로 등록</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="sf-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep(1)} className="text-gray-500 hover:text-white text-xs">← 뒤로</button>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-xs text-gray-400">{role === "dealer" ? "🏪 대리점 가입" : "📞 콜영업팀 가입"}</span>
            </div>

            {/* Username with dupe check */}
            <div>
              <label className="text-xs text-gray-400">아이디<span className="text-red-400 ml-0.5">*</span></label>
              <div className="flex gap-2 mt-1">
                <Input value={form.username || ""} onChange={set("username")} placeholder="영문+숫자"
                  className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm flex-1" />
                <button onClick={checkUsername} disabled={usernameStatus === "checking" || !form.username}
                  className="px-3 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-xs hover:text-white transition-all disabled:opacity-40 shrink-0">
                  {usernameStatus === "checking" ? "확인 중" : "중복확인"}
                </button>
              </div>
              {usernameStatus === "available" && <p className="text-[10px] text-emerald-400 mt-1">✅ 사용 가능한 아이디입니다</p>}
              {usernameStatus === "taken" && <p className="text-[10px] text-red-400 mt-1">❌ 이미 사용 중인 아이디입니다</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-gray-400">비밀번호<span className="text-red-400 ml-0.5">*</span></label>
              <div className="relative mt-1">
                <Input type={showPw ? "text" : "password"} value={form.password || ""} onChange={set("password")} placeholder="6자 이상"
                  className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm pr-10" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-xs text-gray-400">비밀번호 확인<span className="text-red-400 ml-0.5">*</span></label>
              <div className="relative mt-1">
                <Input type={showConfirm ? "text" : "password"} value={form.confirm || ""} onChange={set("confirm")} placeholder="비밀번호 재입력"
                  className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm pr-10" />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {role === "dealer" && (
              <>
                <Field fkey="dealer_name" label="대리점명" placeholder="대리점 상호명" required />
                <Field fkey="owner_name" label="대리점주 이름" placeholder="실명 입력" required />
                <Field fkey="phone" label="연락처" placeholder="010-0000-0000" required />
                <Field fkey="region" label="지역" placeholder="예: 서울, 부산" required />
                <Field fkey="referral_code" label="추천 코드 (선택)" placeholder="추천 코드가 있으면 입력" />
              </>
            )}

            {role === "call_team" && (
              <>
                <Field fkey="name" label="이름" placeholder="실명 입력" required />
                <Field fkey="phone" label="연락처" placeholder="010-0000-0000" required />
                <Field fkey="team" label="소속팀" placeholder="예: A팀, B팀" required />
                <Field fkey="employee_id" label="사원번호 (선택)" placeholder="사원번호가 있으면 입력" />
              </>
            )}

            {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

            <Button onClick={handleSubmit} disabled={loading}
              className={`w-full rounded-xl h-12 font-semibold ${accentBtn}`}>
              {loading ? "신청 중..." : role === "dealer" ? "대리점 가입 신청" : "콜팀 가입 신청"}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link to="/" className="text-gray-400 hover:text-white underline">로그인</Link>
        </p>
      </div>
    </div>
  );
}