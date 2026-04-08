import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { Auth } from "@/api/neonClient";
import OnlineNav from "../components/OnlineNav";
import { toast } from "sonner";

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

function fmt(n, digits = 1) {
  return isNaN(n) || !isFinite(n) ? "-" : n.toFixed(digits);
}

export default function OnlineAds() {
  const username = Auth.getDealerName() || localStorage.getItem("sf_dealer_name") || "";
  const [records, setRecords] = useState([]);
  const [metaAccount, setMetaAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ ad_date: today, ad_cost: "", impressions: "", clicks: "", conversions: "" });

  useEffect(() => {
    Promise.all([
      base44.entities.AdRecord.filter({ username }, "-ad_date", 200),
      base44.entities.OnlineTeamMember.filter({ username }, "-created_date", 1),
    ]).then(([ads, members]) => {
      setRecords(ads);
      if (members[0]) setMetaAccount(members[0].meta_ad_account || "");
    }).finally(() => setLoading(false));
  }, [username]);

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.ad_date) { toast.error("날짜를 입력해주세요."); return; }
    setSubmitting(true);
    try {
      const created = await base44.entities.AdRecord.create({
        username,
        ad_date: form.ad_date,
        ad_cost: Number(form.ad_cost) || 0,
        impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0,
        conversions: Number(form.conversions) || 0,
        meta_ad_account: metaAccount,
      });
      setRecords(prev => [created, ...prev]);
      setForm({ ad_date: today, ad_cost: "", impressions: "", clicks: "", conversions: "" });
      toast.success("광고 실적이 저장되었습니다!");
    } catch (e) {
      toast.error("저장 실패: " + e.message);
    }
    setSubmitting(false);
  };

  // Summary totals
  const totalCost = records.reduce((a, r) => a + (r.ad_cost || 0), 0);
  const totalImpressions = records.reduce((a, r) => a + (r.impressions || 0), 0);
  const totalClicks = records.reduce((a, r) => a + (r.clicks || 0), 0);
  const totalConversions = records.reduce((a, r) => a + (r.conversions || 0), 0);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : NaN;
  const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : NaN;
  const cpa = totalConversions > 0 ? totalCost / totalConversions : NaN;

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      <div className="sticky top-0 z-20 bg-[#080a12] border-b border-white/[0.06] px-5 py-4">
        <h1 className="text-base font-bold text-emerald-400">광고 관리</h1>
        {metaAccount && <p className="text-[10px] text-gray-500">Meta 계정: {metaAccount}</p>}
      </div>

      <div className="px-4 pt-5 space-y-5 max-w-2xl mx-auto">
        {loading ? <Loader /> : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "총 광고비", value: `₩${(totalCost / 10000).toFixed(0)}만`, color: "text-red-400" },
                { label: "총 노출수", value: totalImpressions.toLocaleString(), color: "text-blue-400" },
                { label: "총 클릭수", value: totalClicks.toLocaleString(), color: "text-yellow-400" },
                { label: "CTR", value: `${fmt(ctr)}%`, color: "text-purple-400" },
                { label: "CVR", value: `${fmt(cvr)}%`, color: "text-emerald-400" },
                { label: "CPA", value: isFinite(cpa) ? `₩${Math.round(cpa).toLocaleString()}` : "-", color: "text-orange-400" },
              ].map(c => (
                <div key={c.label} className="bg-[#0d1117] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] text-gray-500 mb-1">{c.label}</p>
                  <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <div className="bg-[#0d1117] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400">📣 광고 실적 입력</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">날짜</label>
                  <input type="date" value={form.ad_date} onChange={setF("ad_date")}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">광고비 (원)</label>
                  <input type="number" value={form.ad_cost} onChange={setF("ad_cost")} placeholder="0"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">노출수</label>
                  <input type="number" value={form.impressions} onChange={setF("impressions")} placeholder="0"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">클릭수</label>
                  <input type="number" value={form.clicks} onChange={setF("clicks")} placeholder="0"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500 block mb-1">DB전환수</label>
                  <input type="number" value={form.conversions} onChange={setF("conversions")} placeholder="0"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                </div>
              </div>
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50 transition-all">
                {submitting ? "저장 중..." : "💾 저장"}
              </button>
            </div>

            {/* Records Table */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-3">광고 기록 ({records.length}건)</p>
              {records.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-6">저장된 광고 기록이 없습니다</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/[0.06]">
                        {["날짜", "광고비", "노출수", "클릭수", "DB수", "CTR", "CVR", "CPA"].map(h => (
                          <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => {
                        const rCtr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : NaN;
                        const rCvr = r.clicks > 0 ? (r.conversions / r.clicks) * 100 : NaN;
                        const rCpa = r.conversions > 0 ? r.ad_cost / r.conversions : NaN;
                        return (
                          <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">{r.ad_date}</td>
                            <td className="py-2.5 px-2 text-red-400">₩{(r.ad_cost || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-2 text-gray-300">{(r.impressions || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-2 text-yellow-400">{(r.clicks || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-2 text-emerald-400">{r.conversions || 0}</td>
                            <td className="py-2.5 px-2 text-purple-400">{fmt(rCtr)}%</td>
                            <td className="py-2.5 px-2 text-blue-400">{fmt(rCvr)}%</td>
                            <td className="py-2.5 px-2 text-orange-400">{isFinite(rCpa) ? `₩${Math.round(rCpa).toLocaleString()}` : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <OnlineNav />
    </div>
  );
}