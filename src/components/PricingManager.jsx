import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import SFCard from "./SFCard";

const DEFAULTS = [
  { setting_key: "sof_price", setting_value: "3.2", setting_label: "SOF 기본 단가 (USDT)" },
  { setting_key: "usdt_rate_manual", setting_value: "1500", setting_label: "USDT 수동 환율" },
  { setting_key: "usdt_rate_auto", setting_value: "true", setting_label: "실시간 환율 자동갱신" },
  { setting_key: "promo_default", setting_value: "300", setting_label: "기본 프로모션 배율 (%)" },
  { setting_key: "maintenance_mode", setting_value: "false", setting_label: "점검 모드" },
];

export default function PricingManager() {
  const [section, setSection] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {["글로벌 설정", "딜러별 단가", "변경 이력"].map((t, i) => (
          <button key={i} onClick={() => setSection(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${section === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      {section === 0 && <GlobalSettings />}
      {section === 1 && <DealerPricingPanel />}
      {section === 2 && <ChangeHistory />}
    </div>
  );
}

/* ─── 글로벌 설정 ─── */
function GlobalSettings() {
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logs, setLogs] = useState([]);
  const adminName = localStorage.getItem("sf_dealer_name") || "관리자";

  useEffect(() => {
    base44.entities.SystemSettings.list().then(async (list) => {
      if (list.length === 0) {
        // seed defaults
        await Promise.all(DEFAULTS.map(d => base44.entities.SystemSettings.create(d)));
        const seeded = await base44.entities.SystemSettings.list();
        const map = {}; seeded.forEach(s => map[s.setting_key] = s);
        setSettings(map);
      } else {
        const map = {}; list.forEach(s => map[s.setting_key] = s);
        setSettings(map);
      }
    });
  }, []);

  const get = (key) => settings[key]?.setting_value ?? DEFAULTS.find(d => d.setting_key === key)?.setting_value ?? "";
  const setVal = (key, val) => setSettings(p => ({ ...p, [key]: { ...p[key], setting_value: String(val) } }));

  const saveSetting = async (key, newValue) => {
    const old = settings[key]?.setting_value;
    setSaving(true);
    const now = new Date().toISOString();
    if (settings[key]?.id) {
      await base44.entities.SystemSettings.update(settings[key].id, {
        setting_value: String(newValue), updated_by: adminName, updated_at: now,
      });
    } else {
      const def = DEFAULTS.find(d => d.setting_key === key);
      await base44.entities.SystemSettings.create({
        setting_key: key, setting_value: String(newValue),
        setting_label: def?.setting_label || key, updated_by: adminName, updated_at: now,
      });
    }
    setSettings(p => ({ ...p, [key]: { ...p[key], setting_value: String(newValue), updated_at: now } }));
    const label = settings[key]?.setting_label || key;
    setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ${label}: ${old} → ${newValue}`, ...prev.slice(0, 19)]);
    setSaved(true); setTimeout(() => setSaved(false), 1500);
    setSaving(false);
  };

  const isAutoRate = get("usdt_rate_auto") === "true";
  const isMaintenance = get("maintenance_mode") === "true";

  return (
    <div className="space-y-4">
      {isMaintenance && (
        <div className="bg-red-950/50 border border-red-700/40 rounded-xl px-4 py-3 text-red-400 text-xs font-medium">
          🔴 현재 점검 모드가 활성화되어 있습니다
        </div>
      )}

      {/* SOF 단가 */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-3">SOF 기본 단가</h3>
        <div className="flex gap-2">
          <input type="number" step="0.01" value={get("sof_price")} onChange={e => setVal("sof_price", e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm" />
          <span className="text-gray-500 text-xs self-center">USDT</span>
          <button onClick={() => saveSetting("sof_price", get("sof_price"))} disabled={saving}
            className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-xl text-xs hover:bg-purple-500/30 transition-all disabled:opacity-50">
            저장
          </button>
        </div>
      </SFCard>

      {/* 기본 프로모션 배율 */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-3">기본 프로모션 배율</h3>
        <div className="flex gap-2">
          {["300", "400"].map(pct => (
            <button key={pct} onClick={() => saveSetting("promo_default", pct)} disabled={saving}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${get("promo_default") === pct ? "bg-purple-500/30 text-purple-300 border border-purple-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
              {pct}%
            </button>
          ))}
        </div>
      </SFCard>

      {/* USDT 환율 */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-3">USDT 환율 설정</h3>
        <div className="flex gap-2 mb-3">
          {[["true", "실시간 자동"], ["false", "수동 고정"]].map(([v, l]) => (
            <button key={v} onClick={() => saveSetting("usdt_rate_auto", v)} disabled={saving}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${get("usdt_rate_auto") === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
              {l}
            </button>
          ))}
        </div>
        {!isAutoRate && (
          <div className="flex gap-2">
            <input type="number" value={get("usdt_rate_manual")} onChange={e => setVal("usdt_rate_manual", e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm" />
            <span className="text-gray-500 text-xs self-center">KRW</span>
            <button onClick={() => saveSetting("usdt_rate_manual", get("usdt_rate_manual"))} disabled={saving}
              className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-xl text-xs hover:bg-purple-500/30 transition-all disabled:opacity-50">
              저장
            </button>
          </div>
        )}
      </SFCard>

      {/* 점검 모드 */}
      <SFCard>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">점검 모드</h3>
            <p className="text-xs text-gray-500 mt-0.5">ON 시 딜러 앱 접근 제한</p>
          </div>
          <button onClick={() => saveSetting("maintenance_mode", isMaintenance ? "false" : "true")} disabled={saving}
            className={`relative w-12 h-6 rounded-full transition-all ${isMaintenance ? "bg-red-500" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isMaintenance ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </SFCard>

      {saved && <p className="text-xs text-emerald-400 text-center">✅ 저장되었습니다</p>}

      {logs.length > 0 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-2">변경 로그</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {logs.map((l, i) => <p key={i} className="text-xs text-gray-500 font-mono">{l}</p>)}
          </div>
        </SFCard>
      )}
    </div>
  );
}

/* ─── 딜러별 단가 ─── */
function DealerPricingPanel() {
  const [dealers, setDealers] = useState([]);
  const [pricings, setPricings] = useState([]);
  const [globalPrice, setGlobalPrice] = useState(3.2);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [d, p, s] = await Promise.all([
        base44.entities.DealerInfo.list("-created_date", 200),
        base44.entities.DealerPricing.list("-updated_at", 200),
        base44.entities.SystemSettings.list(),
      ]);
      setDealers(d);
      setPricings(p);
      const gp = parseFloat(s.find(x => x.setting_key === "sof_price")?.setting_value || "3.2");
      setGlobalPrice(gp);
      setLoading(false);
    })();
  }, []);

  const getPricing = (dealer) => pricings.find(p => p.dealer_id === dealer.id || p.dealer_name === dealer.dealer_name);

  const startEdit = (dealer) => {
    const p = getPricing(dealer);
    setEditId(dealer.id);
    setEditForm({
      custom_sof_price: p?.custom_sof_price || "",
      promo_400_allowed: p?.promo_400_allowed || false,
      custom_promo_pct: p?.custom_promo_pct || "",
      note: p?.note || "",
    });
  };

  const savePricing = async (dealer) => {
    setSaving(true);
    const existing = getPricing(dealer);
    const data = {
      dealer_id: dealer.id,
      dealer_name: dealer.dealer_name,
      custom_sof_price: editForm.custom_sof_price ? parseFloat(editForm.custom_sof_price) : null,
      promo_400_allowed: editForm.promo_400_allowed,
      custom_promo_pct: editForm.custom_promo_pct ? parseFloat(editForm.custom_promo_pct) : null,
      note: editForm.note,
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      await base44.entities.DealerPricing.update(existing.id, data);
      setPricings(prev => prev.map(p => p.id === existing.id ? { ...p, ...data } : p));
    } else {
      const created = await base44.entities.DealerPricing.create(data);
      setPricings(prev => [...prev, created]);
    }
    setEditId(null);
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-gray-500 border-b border-white/[0.06]">
          {["대리점명", "개별단가", "400%허용", "개별배율", "메모", "수정"].map(h => (
            <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {dealers.map(d => {
            const p = getPricing(d);
            const isEditing = editId === d.id;
            return (
              <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                {isEditing ? (
                  <>
                    <td className="py-2 px-2">
                      <input type="number" step="0.01" value={editForm.custom_sof_price}
                        onChange={e => setEditForm(p => ({ ...p, custom_sof_price: e.target.value }))}
                        placeholder={String(globalPrice)}
                        className="w-20 bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-xs" />
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => setEditForm(p => ({ ...p, promo_400_allowed: !p.promo_400_allowed }))}
                        className={`w-10 h-5 rounded-full transition-all ${editForm.promo_400_allowed ? "bg-purple-500" : "bg-white/10"} relative`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${editForm.promo_400_allowed ? "left-5" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <input type="number" value={editForm.custom_promo_pct}
                        onChange={e => setEditForm(p => ({ ...p, custom_promo_pct: e.target.value }))}
                        placeholder="300"
                        className="w-16 bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-xs" />
                    </td>
                    <td className="py-2 px-2">
                      <input value={editForm.note} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
                        placeholder="메모"
                        className="w-24 bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-xs" />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => savePricing(d)} disabled={saving}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                          저장
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="px-2 py-1 bg-white/5 text-gray-400 rounded text-[10px] hover:bg-white/10">
                          취소
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-2">
                      {p?.custom_sof_price ? (
                        <span className="text-yellow-400 font-medium">{p.custom_sof_price} USDT</span>
                      ) : (
                        <span className="text-gray-600 text-[10px]">글로벌 ({globalPrice})</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p?.promo_400_allowed ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-500"}`}>
                        {p?.promo_400_allowed ? "허용" : "불가"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-400">{p?.custom_promo_pct ? `${p.custom_promo_pct}%` : "-"}</td>
                    <td className="py-3 px-2 text-gray-500 max-w-24 truncate">{p?.note || "-"}</td>
                    <td className="py-3 px-2">
                      <button onClick={() => startEdit(d)}
                        className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-[10px] hover:bg-purple-500/30 transition-all">
                        수정
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── 변경 이력 ─── */
function ChangeHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SystemSettings.list().then(list => {
      const changed = list.filter(s => s.updated_at).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).slice(0, 50);
      setHistory(changed);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;

  return (
    <SFCard>
      <h3 className="text-xs font-semibold text-gray-400 mb-3">최근 변경 이력</h3>
      {history.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-6">변경 이력이 없습니다</p>
      ) : (
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["변경일시", "항목", "현재값", "변경자"].map(h => <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {history.map(s => (
              <tr key={s.id} className="border-b border-white/[0.04]">
                <td className="py-2.5 px-2 text-gray-500">{s.updated_at ? new Date(s.updated_at).toLocaleString("ko-KR") : "-"}</td>
                <td className="py-2.5 px-2 text-white">{s.setting_label || s.setting_key}</td>
                <td className="py-2.5 px-2 text-yellow-400 font-mono">{s.setting_value}</td>
                <td className="py-2.5 px-2 text-gray-400">{s.updated_by || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SFCard>
  );
}