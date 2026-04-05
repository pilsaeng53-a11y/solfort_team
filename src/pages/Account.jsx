import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useDealer from "../lib/useDealer";
import SFCard from "../components/SFCard";
import GradeBadge from "../components/GradeBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, LogOut, User, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";

const GRADES = ["GREEN", "PURPLE", "GOLD", "PLATINUM"];

export default function Account() {
  const navigate = useNavigate();
  const { dealer, loading, updateDealer } = useDealer();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (dealer) {
      setForm({
        dealer_name: dealer.dealer_name || "",
        owner_name: dealer.owner_name || "",
        phone: dealer.phone || "",
        region: dealer.region || "",
        grade: dealer.grade || "GREEN",
        rebate_wallet: dealer.rebate_wallet || "",
        usdt_wallet: dealer.usdt_wallet || "",
        backpack_wallet: dealer.backpack_wallet || "",
      });
    }
  }, [dealer]);

  const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    if (!dealer?.id || !form) return;
    setSaving(true);
    await updateDealer(dealer.id, form);
    setSaving(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("sf_dealer");
    localStorage.removeItem("sf_settings");
    localStorage.removeItem("sf_usdt_rate");
    navigate("/");
  };

  const handleChangePw = async () => {
    setPwError('');
    if (pwForm.current !== dealer?.password) {
      setPwError('주면 비밀번호가 다릅니다.');
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwError('6자 이상 입력하세요.');
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError('새 비밀번호가 일치하지 않스늵니다.');
      return;
    }
    setChangingPw(true);
    await base44.entities.DealerInfo.update(dealer.id, { password: pwForm.newPw });
    setPwForm({ current: '', newPw: '', confirm: '' });
    alert('비밀번호가 변경되었습니다.');
    setChangingPw(false);
  };

  if (loading || !form || !dealer) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-400" />
            <h1 className="text-base font-bold text-white">계정 관리</h1>
          </div>
        </div>

        {/* Dealer Info */}
        <SFCard>
          <h3 className="text-white font-semibold text-sm mb-4">대리점 정보</h3>
          <div className="space-y-3">
            {[
              { key: "dealer_name", label: "대리점명" },
              { key: "owner_name", label: "대리점주" },
              { key: "phone", label: "연락처" },
              { key: "region", label: "지역" },
            ].map((f) => (
              <div key={f.key}>
                <Label className="text-xs text-gray-400">{f.label}</Label>
                <Input
                  value={form[f.key]}
                  onChange={update(f.key)}
                  className="bg-white/5 border-white/10 text-white mt-1 rounded-xl"
                />
              </div>
            ))}
          </div>
        </SFCard>

        {/* Grade Selection */}
        <SFCard>
          <h3 className="text-white font-semibold text-sm mb-4">등급 선택</h3>
          <div className="grid grid-cols-2 gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => setForm((p) => ({ ...p, grade: g }))}
                className={`py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  form.grade === g
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                }`}
              >
                <GradeBadge grade={g} />
              </button>
            ))}
          </div>
        </SFCard>

        {/* Wallets */}
        <SFCard>
          <h3 className="text-white font-semibold text-sm mb-4">지갑 주소</h3>
          <div className="space-y-3">
            {[
              { key: "rebate_wallet", label: "리베이트 지갑" },
              { key: "usdt_wallet", label: "USDT 지갑" },
              { key: "backpack_wallet", label: "백팩 지갑" },
            ].map((f) => (
              <div key={f.key}>
                <Label className="text-xs text-gray-400">{f.label}</Label>
                <Input
                  value={form[f.key]}
                  onChange={update(f.key)}
                  placeholder="지갑 주소 입력"
                  className="bg-white/5 border-white/10 text-white mt-1 rounded-xl font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </SFCard>

        {/* Password Change */}
        <SFCard>
          <h3 className="text-white font-semibold text-sm mb-4">비밀번호 변경</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-400">주면 비밀번호</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1 rounded-xl pr-9" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-400">새 비밀번호</Label>
              <Input type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} placeholder="6자 이상" className="bg-white/5 border-white/10 text-white mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">새 비밀번호 확인</Label>
              <Input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1 rounded-xl" />
            </div>
            {pwError && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{pwError}</p>}
            <Button onClick={handleChangePw} disabled={changingPw} className="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 disabled:opacity-50">
              {changingPw ? '변경 중...' : '변경하기'}
            </Button>
          </div>
        </SFCard>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full sf-gradient-btn rounded-xl text-white border-0 h-12"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "저장 중..." : "저장하기"}
        </Button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          로그아웃 (초기화)
        </button>
      </div>
    </div>
  );
}