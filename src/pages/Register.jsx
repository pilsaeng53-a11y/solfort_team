import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import SFLogo from '@/components/SFLogo';
import { Eye, EyeOff, Check, ChevronLeft } from 'lucide-react';

const STEPS = ['역할 선택', '약관 동의', '정보 입력', '신청 완료'];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null); // 'dealer' or 'call_team'
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);
  const [agree4, setAgree4] = useState(false);
  const [agree5, setAgree5] = useState(false);
  const allAgreed = agree1 && agree2 && agree3 && agree4 && agree5;

  const [form, setForm] = useState({
    name: '', username: '', password: '', passwordConfirm: '', phone: '',
    dealer_name: '', region: '', referral_code: '',
    team: '', employee_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [saving, setSaving] = useState(false);
  const termsRef = useRef(null);

  const handleForm = k => e => {
    let value = e.target.value;
    if (k === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 11);
      if (value.length >= 6) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
      } else if (value.length >= 3) {
        value = value.slice(0, 3) + '-' + value.slice(3);
      }
    }
    setForm(p => ({ ...p, [k]: value }));
    if (k === 'username') setDuplicateError('');
  };

  const checkDuplicate = async () => {
    if (!form.username) return;
    const [dealers, callTeam] = await Promise.all([
      base44.entities.DealerInfo.filter({ username: form.username }, '', 1),
      base44.entities.CallTeamMember.filter({ username: form.username }, '', 1),
    ]);
    if (dealers.length > 0 || callTeam.length > 0) {
      setDuplicateError('이미 사용 중인 아이디입니다.');
      return false;
    }
    return true;
  };

  const handleStep1Next = () => {
    if (role) setStep(2);
  };

  const handleStep2Next = () => {
    if (allAgreed) setStep(3);
  };

  const handleStep3Submit = async () => {
    if (!form.username || !form.password || !form.phone) {
      alert('필수 항목을 입력해주세요.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    const isDuplicate = !(await checkDuplicate());
    if (isDuplicate) return;

    setSaving(true);
    const now = new Date().toISOString();
    try {
      if (role === 'dealer') {
        await base44.entities.DealerInfo.create({
          dealer_name: form.dealer_name || form.username,
          owner_name: form.name,
          username: form.username,
          password: form.password,
          phone: form.phone,
          region: form.region,
          referral_code: form.referral_code,
          role: 'dealer',
          status: 'pending',
          agreed_terms: true,
          agreed_at: now,
        });
      } else {
        await base44.entities.CallTeamMember.create({
          name: form.name,
          username: form.username,
          password: form.password,
          phone: form.phone,
          team: form.team,
          employee_id: form.employee_id,
          role: 'call_team',
          status: 'pending',
          agreed_terms: true,
          agreed_at: now,
        });
      }
      setStep(4);
    } catch (e) {
      alert('가입 신청 중 오류가 발생했습니다: ' + e.message);
    }
    setSaving(false);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-[#080a12] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <SFLogo size="sm" />
            <div>
              <p className="text-sm font-bold text-white">SolFort</p>
              <p className="text-xs text-gray-500">가입</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => {
              const isActive = step === i + 1;
              const isCompleted = step > i + 1;
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-white text-black' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] truncate ${
                    isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-gray-600'
                  }`}>{s}</span>
                </div>
              );
            })}
          </div>

          {/* STEP 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-6">어떤 역할로 가입하시겠어요?</h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setRole('dealer')}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    role === 'dealer'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}>
                  <p className="text-2xl mb-2">🏪</p>
                  <p className="text-xs font-semibold text-white mb-1">대리점</p>
                  <p className="text-[9px] text-gray-500">오프라인 미팅 · 현장 응대 · 고객 계약</p>
                </button>
                <button onClick={() => setRole('call_team')}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    role === 'call_team'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}>
                  <p className="text-2xl mb-2">📞</p>
                  <p className="text-xs font-semibold text-white mb-1">콜영업팀</p>
                  <p className="text-[9px] text-gray-500">전화 영업 · 고객 발굴 · 리드 관리</p>
                </button>
              </div>
              <button onClick={handleStep1Next} disabled={!role}
                className="w-full mt-6 py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                다음
              </button>
            </div>
          )}

          {/* STEP 2: Terms and Conditions */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-4">약관 동의</h2>
              <div ref={termsRef} className="bg-black/40 border border-red-500/30 rounded-xl p-4 text-[10px] text-gray-300 max-h-64 overflow-y-auto space-y-2">
                <p className="font-bold text-red-400">【SolFort 서비스 이용 주의사항】</p>
                <p className="font-semibold">■ 본 서비스의 성격</p>
                <p>SolFort 앱은 영업 활동을 지원하는 내부 관리 도구입니다.</p>
                <p className="font-semibold mt-3">■ 유사수신행위 금지</p>
                <p>유사수신행위의 규제에 관한 법률에 따라 인가 없이 불특정 다수로부터 자금을 수신하거나 원금 또는 이자의 지급을 약정하는 행위는 금지됩니다. 위반 시 해당 영업 행위를 한 당사자가 전적으로 법적 책임을 집니다.</p>
                <p className="font-semibold mt-3">■ 고객 기망행위 금지</p>
                <p>허위 사실 고지, 과장된 수익 약속 등 고객을 기망하는 영업 행위는 민·형사상 처벌 대상입니다. 이로 인한 모든 책임은 해당 영업 담당자 본인에게 귀속됩니다.</p>
                <p className="font-semibold mt-3">■ 고객 정보 고지 의무</p>
                <p>계약 체결 전 고객에게 계약서상 모든 조건, 리스크, 의무사항을 충분히 설명하고 인지시킬 책임은 해당 영업 담당자에게 있습니다. 미고지로 발생하는 모든 민사 및 형사상 책임은 본인에게 귀속됩니다.</p>
                <p className="font-semibold mt-3">■ 본인 정보 사용 의무 및 퇴출 규정</p>
                <p>가입 시 제공한 모든 정보는 반드시 본인의 실제 정보여야 합니다. 허위 정보 확인 시 사전 통보 없이 즉시 퇴출 처리될 수 있습니다. 총관리자는 서비스 운영 목적으로 모든 가입자 정보를 열람할 수 있습니다.</p>
                <p className="font-semibold mt-3">■ 서비스 제공자의 책임 한계</p>
                <p>SolFort는 영업 지원 도구를 제공할 뿐이며, 개별 영업에 대한 책임은 당사자에게 있습니다.</p>
              </div>
              <div className="space-y-2">
                {[
                  [agree1, setAgree1, '위 주의사항을 모두 읽고 충분히 이해하였습니다.'],
                  [agree2, setAgree2, '유사수신행위 및 고객 기망행위로 인한 법적 책임은 본인 또는 소속 지점에 있음을 인정합니다.'],
                  [agree3, setAgree3, 'SolFort는 영업 지원 도구임을 이해하며, 플랫폼 제공자는 개별 영업에 대한 책임이 없음에 동의합니다.'],
                  [agree4, setAgree4, '고객에게 계약서상 모든 사항을 충분히 인지시키지 못하여 발생하는 모든 민사 및 형사상 책임은 본인에게 있음을 충분히 인지하였습니다.'],
                  [agree5, setAgree5, '본인 정보가 아닌 경우 사전 통보 없이 즉시 퇴출될 수 있음을 인지하였으며, 총관리자의 가입자 정보 열람 권한에 동의합니다.'],
                ].map(([checked, setter, label], i) => (
                  <label key={i} className="flex items-start gap-2.5 cursor-pointer hover:bg-white/5 p-2 rounded transition-all">
                    <input type="checkbox" checked={checked} onChange={e => setter(e.target.checked)} className="mt-0.5 w-4 h-4 cursor-pointer" />
                    <span className="text-[10px] text-gray-400">[필수] {label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleBack}
                  className="flex-1 py-2.5 bg-white/5 text-gray-400 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all">
                  이전
                </button>
                <button onClick={handleStep2Next} disabled={!allAgreed}
                  className="flex-1 py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  다음
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Role-Specific Form */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-4">정보 입력</h2>
              {role === 'dealer' ? (
                <>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">아이디 <span className="text-red-400">*</span></label>
                      <input value={form.username} onChange={handleForm('username')} placeholder="영문/숫자"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                      {duplicateError && <p className="text-[10px] text-red-400 mt-1">{duplicateError}</p>}
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">비밀번호 <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleForm('password')}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 pr-9" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">비밀번호 확인 <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <input type={showPasswordConfirm ? 'text' : 'password'} value={form.passwordConfirm} onChange={handleForm('passwordConfirm')}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 pr-9" />
                        <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300">
                          {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">대리점명 <span className="text-red-400">*</span></label>
                      <input value={form.dealer_name} onChange={handleForm('dealer_name')} placeholder="예: ABC 대리점"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">대리점주 이름 <span className="text-red-400">*</span></label>
                      <input value={form.name} onChange={handleForm('name')} placeholder="홍길동"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">연락처 <span className="text-red-400">*</span></label>
                      <input value={form.phone} onChange={handleForm('phone')} placeholder="010-1234-5678"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">지역</label>
                      <input value={form.region} onChange={handleForm('region')} placeholder="서울"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">추천코드</label>
                      <input value={form.referral_code} onChange={handleForm('referral_code')} placeholder="선택사항"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                </>
              ) : (
                <>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">아이디 <span className="text-red-400">*</span></label>
                      <input value={form.username} onChange={handleForm('username')} placeholder="영문/숫자"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                      {duplicateError && <p className="text-[10px] text-red-400 mt-1">{duplicateError}</p>}
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">비밀번호 <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleForm('password')}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 pr-9" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">비밀번호 확인 <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <input type={showPasswordConfirm ? 'text' : 'password'} value={form.passwordConfirm} onChange={handleForm('passwordConfirm')}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 pr-9" />
                        <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300">
                          {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">이름 <span className="text-red-400">*</span></label>
                      <input value={form.name} onChange={handleForm('name')} placeholder="홍길동"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">연락처 <span className="text-red-400">*</span></label>
                      <input value={form.phone} onChange={handleForm('phone')} placeholder="010-1234-5678"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">소속팀 <span className="text-red-400">*</span></label>
                      <input value={form.team} onChange={handleForm('team')} placeholder="A팀"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">사원번호</label>
                      <input value={form.employee_id} onChange={handleForm('employee_id')} placeholder="선택사항"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                    </div>
                </>
              )}

              <div className="flex gap-2 mt-6">
                <button onClick={handleBack}
                  className="flex-1 py-2.5 bg-white/5 text-gray-400 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all">
                  이전
                </button>
                <button onClick={handleStep3Submit} disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
                  {saving ? '신청 중...' : role === 'dealer' ? '대리점 가입 신청' : '콜팀 가입 신청'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Completion */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <p className="text-5xl mb-4">✅</p>
              <h2 className="text-lg font-bold text-white">가입 신청이 완료되었습니다!</h2>
              <p className="text-sm text-gray-400">관리자 승인 후 로그인 가능합니다.</p>
              <button onClick={() => navigate('/')}
                className="w-full mt-8 py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-all">
                로그인 페이지로 이동
              </button>
            </div>
          )}
        </div>
        </div>

        {/* Bottom login link */}
        <div className="py-4 text-center border-t border-white/[0.06]">
        <p className="text-xs text-gray-500">이미 계정이 있으신가요? <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">로그인</button></p>
        </div>
        </div>
        );
}