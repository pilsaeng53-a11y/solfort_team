import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SFLogo from "../components/SFLogo";
import SFCard from "../components/SFCard";
import UsdtBanner from "../components/UsdtBanner";
import useMarketData from "../lib/useMarketData";
import useDealer from "../lib/useDealer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Settings, Store } from "lucide-react";

export default function Setup() {
  const navigate = useNavigate();
  const { rate, source, loading: rateLoading, fetchRate } = useMarketData();
  const { dealer, loading: dealerLoading, saveDealer } = useDealer();
  const [activeTab, setActiveTab] = useState("dealer");
  const [form, setForm] = useState({
    dealer_name: "", owner_name: "", phone: "", region: "",
    rebate_wallet: "", usdt_wallet: "", backpack_wallet: "",
  });
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("sf_settings");
    return saved ? JSON.parse(saved) : { rateMode: "auto", manualRate: 1500, tokenPrice: 3.2, promotionPct: 300 };
  });

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem("sf_settings", JSON.stringify(next));
  };

  const currentRate = settings.rateMode === "manual" ? settings.manualRate : (rate || 1500);
  const previewUsdt = 1000000 / currentRate;
  const previewBase = previewUsdt / settings.tokenPrice;
  const previewFinal = previewBase * (settings.promotionPct / 100);

  const handleSave = async () => {
    setSaving(true);
    await saveDealer({ ...form, grade: "GREEN" });
    setSaving(false);
    navigate("/dashboard");
  };

  if (dealerLoading) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Logo Header */}
        <div className="flex items-center gap-4">
          <SFLogo size="lg" />
          <div>
            <h1 className="text-xl font-bold text-white">SolFort</h1>
            <p className="text-sm text-gray-500">딜러 세일즈 오퍼레이션</p>
          </div>
        </div>

        {/* USDT Banner */}
        <UsdtBanner rate={rate} source={source} loading={rateLoading} onRefresh={fetchRate} />

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: "dealer", icon: Store, label: "대리점 정보" },
            { key: "settings", icon: Settings, label: "운영 설정" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dealer Info Tab */}
        {activeTab === "dealer" && (
          <>
            {dealer ? (
              <DealerInfoDisplay dealer={dealer} onNavigate={() => navigate("/dashboard")} />
            ) : (
              <DealerForm form={form} setForm={setForm} saving={saving} onSave={handleSave} />
            )}
          </>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <SettingsPanel
            settings={settings}
            updateSetting={updateSetting}
            currentRate={currentRate}
            previewUsdt={previewUsdt}
            previewBase={previewBase}
            previewFinal={previewFinal}
          />
        )}
      </div>
    </div>
  );
}

function DealerInfoDisplay({ dealer, onNavigate }) {
  return (
    <SFCard glow>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">등록된 대리점</h2>
          <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">활성</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["대리점명", dealer.dealer_name],
            ["대리점주", dealer.owner_name],
            ["연락처", dealer.phone],
            ["지역", dealer.region || "-"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <Button onClick={onNavigate} className="w-full sf-gradient-btn rounded-xl text-white border-0 h-12">
          대시보드로 이동 <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </SFCard>
  );
}

function DealerForm({ form, setForm, saving, onSave }) {
  const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const fields = [
    { key: "dealer_name", label: "대리점명 *", placeholder: "예: 서울 강남점" },
    { key: "owner_name", label: "대리점주 *", placeholder: "예: 홍길동" },
    { key: "phone", label: "연락처 *", placeholder: "010-0000-0000" },
    { key: "region", label: "지역", placeholder: "예: 서울 강남구" },
    { key: "rebate_wallet", label: "리베이트 지갑", placeholder: "지갑 주소" },
    { key: "usdt_wallet", label: "USDT 지갑", placeholder: "USDT 지갑 주소" },
    { key: "backpack_wallet", label: "백팩 지갑", placeholder: "백팩 지갑 주소" },
  ];

  const valid = form.dealer_name && form.owner_name && form.phone;

  return (
    <SFCard>
      <h2 className="text-white font-semibold mb-4">대리점 등록</h2>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-gray-400">{f.label}</Label>
            <Input
              value={form[f.key]}
              onChange={update(f.key)}
              placeholder={f.placeholder}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 mt-1 rounded-xl"
            />
          </div>
        ))}
        <Button
          onClick={onSave}
          disabled={!valid || saving}
          className="w-full sf-gradient-btn rounded-xl text-white border-0 h-12 mt-4"
        >
          {saving ? "저장 중..." : "대리점 등록"}
        </Button>
      </div>
    </SFCard>
  );
}

function SettingsPanel({ settings, updateSetting, currentRate, previewUsdt, previewBase, previewFinal }) {
  return (
    <div className="space-y-4">
      {/* Rate Mode */}
      <SFCard>
        <h3 className="text-white font-semibold text-sm mb-3">USDT 환율 설정</h3>
        <div className="flex gap-2 mb-3">
          {["auto", "manual"].map((mode) => (
            <button
              key={mode}
              onClick={() => updateSetting("rateMode", mode)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                settings.rateMode === mode
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {mode === "auto" ? "실시간" : "수동 입력"}
            </button>
          ))}
        </div>
        {settings.rateMode === "manual" && (
          <Input
            type="number"
            value={settings.manualRate}
            onChange={(e) => updateSetting("manualRate", parseFloat(e.target.value) || 0)}
            className="bg-white/5 border-white/10 text-white rounded-xl"
          />
        )}
        <p className="text-xs text-gray-500 mt-2">현재 적용 환율: ₩{currentRate.toLocaleString()}</p>
      </SFCard>

      {/* Token Price */}
      <SFCard>
        <h3 className="text-white font-semibold text-sm mb-3">SOF 가격 (USDT)</h3>
        <Input
          type="number"
          step="0.1"
          value={settings.tokenPrice}
          onChange={(e) => updateSetting("tokenPrice", parseFloat(e.target.value) || 0)}
          className="bg-white/5 border-white/10 text-white rounded-xl"
        />
      </SFCard>

      {/* Promotion */}
      <SFCard>
        <h3 className="text-white font-semibold text-sm mb-3">프로모션 배율</h3>
        <div className="flex gap-2">
          {[300, 400].map((pct) => (
            <button
              key={pct}
              onClick={() => updateSetting("promotionPct", pct)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                settings.promotionPct === pct
                  ? "sf-gradient-btn text-white"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </SFCard>

      {/* Preview */}
      <SFCard glow>
        <h3 className="text-white font-semibold text-sm mb-3">💰 100만원 기준 예상</h3>
        <div className="space-y-2">
          {[
            ["USDT 환산", `${previewUsdt.toFixed(2)} USDT`],
            ["기본 SOF", `${previewBase.toFixed(2)} SOF`],
            [`최종 SOF (${settings.promotionPct}%)`, `${previewFinal.toFixed(2)} SOF`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-sm text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      </SFCard>
    </div>
  );
}