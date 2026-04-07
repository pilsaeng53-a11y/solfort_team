import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";

const today = new Date();
const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

function Loader() {
  return <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}

export default function IncentivePanel() {
  const [perCount, setPerCount] = useState("0");
  const [pctAmount, setPctAmount] = useState("0");
  const [saving, setSaving] = useState(false);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payHistory, setPayHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, l, h] = await Promise.all([
          base44.entities.SystemSettings.filter({ setting_key: "incentive_per_count" }),
          base44.entities.SalesRecord.list("-created_date", 5000),
          base44.entities.SystemLog.filter({ action: "incentive_paid" }),
        ]);
        setPerCount(s[0]?.setting_value || "0");
        setSales(l);
        setPayHistory(h);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const [s1, s2] = await Promise.all([
        base44.entities.SystemSettings.filter({ setting_key: "incentive_per_count" }),
        base44.entities.SystemSettings.filter({ setting_key: "incentive_pct_amount" }),
      ]);
      if (s1[0]) {
        await base44.entities.SystemSettings.update(s1[0].id, { setting_value: perCount });
      } else {
        await base44.entities.SystemSettings.create({
          setting_key: "incentive_per_count",
          setting_label: "ë§¤ì¶ì í ê±´ë¹ ì¸ì¼í°ë¸",
          setting_value: perCount,
          updated_at: new Date().toISOString(),
        });
      }
      if (s2[0]) {
        await base44.entities.SystemSettings.update(s2[0].id, { setting_value: pctAmount });
      } else {
        await base44.entities.SystemSettings.create({
          setting_key: "incentive_pct_amount",
          setting_label: "ë§¤ì¶ê¸ì¡ ì¸ì¼í°ë¸ %",
          setting_value: pctAmount,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}
    setSaving(false);
  };

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  const monthSales = sales.filter(s => s.sale_date >= monthStart && s.sale_date <= monthEnd);

  const incentives = {};
  monthSales.forEach(s => {
    const key = s.created_by || "ë¯¸ì§ì ";
    if (!incentives[key]) {
      incentives[key] = { name: key, count: 0, total: 0, paid: [] };
    }
    incentives[key].count += 1;
    incentives[key].total += s.sales_amount || 0;
  });

  const incentiveList = Object.values(incentives).map(i => ({
    ...i,
    countIncentive: i.count * Number(perCount),
    amountIncentive: i.total * (Number(pctAmount) / 100),
    totalIncentive: i.count * Number(perCount) + i.total * (Number(pctAmount) / 100),
  }));

  const totalIncentive = incentiveList.reduce((a, i) => a + i.totalIncentive, 0);

  const submitPayment = async () => {
    setPaying(true);
    try {
      await base44.entities.SystemLog.create({
        log_type: "incentive",
        actor: JSON.parse(localStorage.getItem('sf_user')||'{}').name,
        actor_role: JSON.parse(localStorage.getItem('sf_user')||'{}').role,
        action: "incentive_paid",
        before_value: JSON.stringify({
          month,
          totalAmount: totalIncentive,
          memberCount: incentiveList.length,
          details: incentiveList,
        }),
        created_at: new Date().toISOString(),
      });
      alert("ì¸ì¼í°ë¸ ì§ê¸ì´ ê¸°ë¡ëììµëë¤.");
      const h = await base44.entities.SystemLog.filter({ action: "incentive_paid" });
      setPayHistory(h);
    } catch {}
    setPaying(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* Settings */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">ì¸ì¼í°ë¸ ê¸°ì¤ ì¤ì </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">ë§¤ì¶ì í ê±´ë¹ ì¸ì¼í°ë¸</label>
            <input
              type="number"
              value={perCount}
              onChange={e => setPerCount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">ë§¤ì¶ê¸ì¡ Ã (%) ì¸ì¼í°ë¸</label>
            <input
              type="number"
              value={pctAmount}
              onChange={e => setPctAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold hover:bg-purple-500/30 disabled:opacity-50"
          >
            {saving ? "ì ì¥ ì¤..." : "ì ì¥"}
          </button>
        </div>
      </SFCard>

      {/* Calculation */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">{month} ì¸ì¼í°ë¸ ê³ì°</h3>
        {incentiveList.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">ì´ë² ë¬ ë§¤ì¶ì´ ììµëë¤</p>
        ) : (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/[0.06]">
                    {["íìëª", "ê±´ì", "ì´ë§¤ì¶", "ê±´ìì¸ì¼", "ê¸ì¡ì¸ì¼", "í©ê³"].map(h => (
                      <th key={h} className="text-left py-2 px-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incentiveList.map((i, idx) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2 px-2 text-white">{i.name}</td>
                      <td className="py-2 px-2 text-gray-400">{i.count}</td>
                      <td className="py-2 px-2 text-white">â©{i.total.toLocaleString()}</td>
                      <td className="py-2 px-2 text-emerald-400">â©{i.countIncentive.toLocaleString()}</td>
                      <td className="py-2 px-2 text-emerald-400">â©{i.amountIncentive.toLocaleString()}</td>
                      <td className="py-2 px-2 text-yellow-400 font-semibold">â©{i.totalIncentive.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 text-sm">
              <span className="text-gray-500">ì ì²´ í©ê³:</span>
              <span className="text-yellow-400 font-bold">â©{totalIncentive.toLocaleString()}</span>
            </div>
            <button
              onClick={submitPayment}
              disabled={paying}
              className="w-full mt-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {paying ? "ì²ë¦¬ ì¤..." : "ì§ê¸ ìë£ ì²ë¦¬"}
            </button>
          </>
        )}
      </SFCard>

      {/* History */}
      {payHistory.length > 0 && (
        <SFCard>
          <h3 className="text-sm font-semibold text-white mb-3">ì§ê¸ ì´ë ¥</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {payHistory.slice(0, 20).map(h => (
              <div key={h.id} className="text-xs text-gray-400 pb-2 border-b border-white/[0.04]">
                <p className="text-white font-medium">{(h.created_at || "").split("T")[0]}</p>
                <p>{h.actor} ì²ë¦¬</p>
              </div>
            ))}
          </div>
        </SFCard>
      )}
    </div>
  );
}