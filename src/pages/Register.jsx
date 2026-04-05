import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SFLogo from "../components/SFLogo";

const INITIAL_DEALER = { username: "", password: "", confirm: "", dealer_name: "", owner_name: "", phone: "", region: "", referral_code: "" };
const INITIAL_CALL = { username: "", password: "", confirm: "", name: "", phone: "", team: "", employee_id: "" };

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const selectRole = (r) => {
    setRole(r);
    setForm(r === "dealer" ? INITIAL_DEALER : INITIAL_CALL);
    setStep(2);
  };

  const validate = () => {
    if (!form.username || !form.password || !form.confirm) return "필수 항목을 모두 입력하세요";
    if (!/^[a-zA-Z0-9]+$/.test(form.username)) return "아이디는 영문+숫자만 사용 가능합니다";
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
        dealer_name: form.dealer_name,
        owner_name: form.owner_name,
        phone: form.phone,
        region: form.region,
        grade: "GREEN",
        username: form.username,
        password: form.password,
        role: "dealer",
        status: "pending",
        referral_code: form.referral_code || "",
      });
    } else {
      await base44.entities.CallTeamMember.create({
        username: form.username,
        password: form.password,
        name: form.name,
        phone: form.phone,
        team: form.team,
        employee_id: form.employee_id || "",
        role: "call_team",
        status: "pending",
      });
    }
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/"), 3000);
  };

  const accentBtn = role === "call_team"
    ? "bg-emerald-600 hover:bg-emerald-500 text-white border-0"
    : "sf-gradient-btn text-white border-0";

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

        {success && (
          <div className="sf-card rounded-2xl p-6 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="text-white font-semibold">가입 신청이 완료되었습니다</p>
            <p className="text-xs text-gray-400">관리자 승인 후 로그인 가능합니다.<br />잠시 후 로그인 페이지로 이동합니다.</p>
          </div>
        )}

        {!success && step === 1 && (
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

        {!success && step === 2 && (
          <div className="sf-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep(1)} className="text-gray-500 hover:text-white text-xs">← 뒤로</button>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-xs text-gray-400">{role === "dealer" ? "🏪 대리점 가입" : "📞 콜영업팀 가입"}</span>
            </div>

            {[
              { key: "username", label: "아이디", placeholder: "영문+숫자" },
              { key: "password", label: "비밀번호", placeholder: "6자 이상", type: "password" },
              { key: "confirm", label: "비밀번호 확인", placeholder: "비밀번호 재입력", type: "password" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400">{f.label}</label>
                <Input type={f.type || "text"} value={form[f.key] || ""} onChange={set(f.key)}
                  placeholder={f.placeholder}
                  className="bg-white/5 border-white/10 text-white mt-1 rounded-xl h-10 text-sm" />
              </div>
            ))}

            {role === "dealer" && [
              { key: "dealer_name", label: "대리점명", placeholder: "대리점 상호명" },
              { key: "owner_name", label: "대리점주 이름", placeholder: "실명 입력" },
              { key: "phone", label: "연락처", placeholder: "010-0000-0000" },
              { key: "region", label: "지역", placeholder: "예: 서울, 부산" },
              { key: "referral_code", label: "추천 코드 (선택)", placeholder: "추천 코드가 있으면 입력" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400">{f.label}</label>
                <Input value={form[f.key] || ""} onChange={set(f.key)} placeholder={f.placeholder}
                  className="bg-white/5 border-white/10 text-white mt-1 rounded-xl h-10 text-sm" />
              </div>
            ))}

            {role === "call_team" && [
              { key: "name", label: "이름", placeholder: "실명 입력" },
              { key: "phone", label: "연락처", placeholder: "010-0000-0000" },
              { key: "team", label: "소속팀", placeholder: "예: A팀, B팀" },
              { key: "employee_id", label: "사원번호 (선택)", placeholder: "사원번호가 있으면 입력" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400">{f.label}</label>
                <Input value={form[f.key] || ""} onChange={set(f.key)} placeholder={f.placeholder}
                  className="bg-white/5 border-white/10 text-white mt-1 rounded-xl h-10 text-sm" />
              </div>
            ))}

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