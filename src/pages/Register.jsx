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
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);
  const [agree4, setAgree4] = useState(false);

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
    const now = new Date().toISOString();
    if (role === "dealer") {
      await base44.entities.DealerInfo.create({
        dealer_name: form.dealer_name, owner_name: form.owner_name, phone: form.phone,
        region: form.region, grade: "GREEN", username: form.username, password: form.password,
        role: "dealer", status: "pending", referral_code: form.referral_code || "",
        agreed_terms: true, agreed_at: now,
      });
    } else {
      await base44.entities.CallTeamMember.create({
        username: form.username, password: form.password, name: form.name,
        phone: form.phone, team: form.team, employee_id: form.employee_id || "",
        role: "call_team", status: "pending",
        agreed_terms: true, agreed_at: now,
      });
    }
    setLoading(false);
    setSuccess(true);
  };

  const accentBtn = role === "call_team" ? "bg-emerald-600 hover:bg-emerald-500 text-white border-0" : "sf-gradient-btn text-white border-0";
  const allAgreed = agree1 && agree2 && agree3 && agree4;

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

        {/* Step indicator */}
        {step >= 1 && (
          <div className="flex items-center justify-between text-xs">
            <div className={`flex-1 text-center pb-2 border-b-2 ${step === 1 ? "border-white text-white" : step > 1 ? "border-emerald-500 text-emerald-400" : "border-gray-600 text-gray-600"}`}>① 역할 선택</div>
            <div className={`flex-1 text-center pb-2 border-b-2 ${step === 2 ? "border-white text-white" : step > 2 ? "border-emerald-500 text-emerald-400" : "border-gray-600 text-gray-600"}`}>② 약관 동의</div>
            <div className={`flex-1 text-center pb-2 border-b-2 ${step === 3 ? "border-white text-white" : step > 3 ? "border-emerald-500 text-emerald-400" : "border-gray-600 text-gray-600"}`}>③ 정보 입력</div>
            <div className={`flex-1 text-center pb-2 border-b-2 ${step === 4 ? "border-white text-white" : "border-gray-600 text-gray-600"}`}>④ 완료</div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center">가입 유형을 선택하세요</p>
            <button onClick={() => selectRole("dealer")}
              className="w-full sf-card rounded-2xl p-5 text-left hover:border-blue-500/30 border border-transparent transition-all group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl shrink-0">🏪</div>
                <div>
                  <p className="text-white font-semibold group-hover:text-blue-400 transition-colors">대리점</p>
                  <p className="text-xs text-gray-500 mt-1">오프라인 미팅 · 현장 응대 · 고객 계약</p>
                </div>
              </div>
            </button>
            <button onClick={() => selectRole("call_team")}
              className="w-full sf-card rounded-2xl p-5 text-left hover:border-emerald-500/30 border border-transparent transition-all group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl shrink-0">📞</div>
                <div>
                  <p className="text-white font-semibold group-hover:text-emerald-400 transition-colors">콜영업팀</p>
                  <p className="text-xs text-gray-500 mt-1">전화 영업 · 고객 발굴 · 리드 관리</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="sf-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setStep(1)} className="text-gray-500 hover:text-white text-xs">← 뒤로</button>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-xs text-gray-400">{role === "dealer" ? "🏪 대리점 가입" : "📞 콜영업팀 가입"}</span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">서비스 이용 약관 동의</h3>
              <p className="text-xs text-gray-500 mt-1">아래 내용을 반드시 읽고 동의해주세요</p>
            </div>

            <div className={`border rounded-xl p-4 max-h-64 overflow-y-auto text-xs text-gray-300 leading-relaxed space-y-3 ${allAgreed ? "border-emerald-500/50" : "border-red-500/30"}`}>
              <div>
                <p className="font-semibold text-white mb-2">【SolFort 서비스 이용 주의사항】</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-1">■ 본 서비스의 성격</p>
                <p>SolFort 앱은 영업 활동을 지원하는 내부 관리 도구입니다.
고객 관리, 매출 기록, 일정 관리 등 업무 효율화를 위한
소프트웨어 서비스를 제공합니다.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-1">■ 유사수신행위 금지</p>
                <p>「유사수신행위의 규제에 관한 법률」에 따라,
인가 없이 불특정 다수로부터 자금을 수신하거나
원금 또는 이자의 지급을 약정하는 행위는 엄격히 금지됩니다.
본 서비스를 이용한 유사수신행위 발생 시,
해당 영업 행위를 한 당사자(가입자 본인 또는 소속 지점)가
전적으로 법적 책임을 집니다.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-1">■ 고객 기망행위 금지</p>
                <p>허위 사실 고지, 과장된 수익 약속, 사실과 다른 설명 등
고객을 기망하는 영업 행위는 민·형사상 처벌 대상이 됩니다.
이로 인한 모든 법적 분쟁 및 피해는
해당 영업을 진행한 지점 또는 본인이 전적으로 책임지며,
SolFort 플랫폼은 어떠한 책임도 지지 않습니다.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-1">■ 고객 정보 고지 의무</p>
                <p>계약 체결 전 고객에게 계약서상 모든 조건, 리스크, 의무사항을
충분히 설명하고 인지시킬 책임은 해당 영업 담당자에게 있습니다.
고객이 계약 내용을 충분히 인지하지 못한 상태에서
계약이 체결되어 발생하는 모든 민사 및 형사상 분쟁, 손해배상,
법적 책임은 해당 영업 담당자 본인에게 귀속됩니다.
SolFort 플랫폼은 이에 대한 어떠한 책임도 지지 않습니다.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-1">■ 서비스 제공자의 책임 한계</p>
                <p>SolFort는 영업 활동을 돕는 도구(Tool)를 제공할 뿐이며,
실제 영업 과정에서 발생하는 모든 법적·재무적 책임은
해당 영업 행위 당사자에게 있습니다.
플랫폼 제공자는 개별 영업 내용에 대해 책임지지 않습니다.</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-1">■ 동의 효력</p>
                <p>본 약관에 동의하고 가입 신청 시,
위 모든 내용을 충분히 이해하고 동의한 것으로 간주됩니다.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agree1} onChange={e => setAgree1(e.target.checked)} className="mt-1.5 w-4 h-4" />
                <span className="text-sm text-gray-300"><span className="text-red-400 text-xs">[필수]</span> 위 주의사항을 모두 읽고 충분히 이해하였습니다.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agree2} onChange={e => setAgree2(e.target.checked)} className="mt-1.5 w-4 h-4" />
                <span className="text-sm text-gray-300"><span className="text-red-400 text-xs">[필수]</span> 유사수신행위 및 고객 기망행위로 인한 법적 책임은 본인 또는 소속 지점에 있음을 인정합니다.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agree3} onChange={e => setAgree3(e.target.checked)} className="mt-1.5 w-4 h-4" />
                <span className="text-sm text-gray-300"><span className="text-red-400 text-xs">[필수]</span> SolFort는 영업 지원 도구임을 이해하며, 플랫폼 제공자는 개별 영업에 대한 책임이 없음에 동의합니다.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agree4} onChange={e => setAgree4(e.target.checked)} className="mt-1.5 w-4 h-4" />
                <span className="text-sm text-gray-300"><span className="text-red-400 text-xs">[필수]</span> 고객에게 계약서상 모든 사항을 충분히 인지시키지 못하여 발생하는 모든 민사 및 형사상 책임은 본인에게 있음을 충분히 인지하였습니다.</span>
              </label>
            </div>

            <Button onClick={() => setStep(3)} disabled={!allAgreed}
              className={`w-full rounded-xl h-12 font-semibold ${allAgreed ? accentBtn : "opacity-40 cursor-not-allowed bg-gray-600 text-white border-0"}`}>
              다음 (약관 동의 완료)
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="sf-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep(2)} className="text-gray-500 hover:text-white text-xs">← 뒤로</button>
              <span className="text-xs text-gray-500">|</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${role === "dealer" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {role === "dealer" ? "🏪 대리점 가입" : "📞 콜영업팀 가입"}
              </span>
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