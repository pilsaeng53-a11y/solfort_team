import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import SFCard from "@/components/SFCard";
import { Check, Send } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const BOT_TOKEN = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
const CHAT_ID = "5757341051";

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

function sendTelegram(msg) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: msg }),
  }).catch(() => {});
}

export default function SalesSettlement() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [records, setRecords] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    document.title = "SolFort - 매출 정산";
    load();
  }, [month]);

  const load = async () => {
    setLoading(true);
    try {
      const [settleRecords, saleRecords] = await Promise.all([
        base44.entities.SalesSettlement.list("-created_at", 500),
        base44.entities.SalesRecord.list("-sale_date", 5000),
      ]);
      setRecords(settleRecords);
      setSales(saleRecords);
    } catch {}
    setLoading(false);
  };

  const monthRecords = records.filter(r => (r.period || "").startsWith(month));
  const monthSales = sales.filter(s => (s.sale_date || "").startsWith(month));
  
  const totalSales = monthSales.reduce((a, s) => a + (s.sales_amount || 0), 0);
  const confirmedSales = monthRecords.filter(r => r.status === "confirmed").reduce((a, r) => a + (r.total_sales || 0), 0);
  const pendingSales = monthRecords.filter(r => r.status === "pending").reduce((a, r) => a + (r.total_sales || 0), 0);
  const paidSales = monthRecords.filter(r => r.status === "paid").reduce((a, r) => a + (r.total_sales || 0), 0);

  const updateRecord = async (id, status) => {
    setUpdating(id);
    try {
      const record = monthRecords.find(r => r.id === id);
      await base44.entities.SalesSettlement.update(id, { status });
      
      if (status === "paid") {
        const msg = `💰 인센티브 지급완료\n[${record.dealer_name}]: ₩${(record.commission_krw || 0).toLocaleString()}`;
        await sendTelegram(msg);
      }
      
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch {}
    setUpdating(null);
  };

  const bulkConfirm = async () => {
    const pending = monthRecords.filter(r => r.status === "pending");
    setUpdating("bulk");
    for (const r of pending) {
      await base44.entities.SalesSettlement.update(r.id, { status: "confirmed" });
    }
    setRecords(prev => prev.map(r => (r.period || "").startsWith(month) && r.status === "pending" ? { ...r, status: "confirmed" } : r));
    setUpdating(null);
  };

  const bulkPay = async () => {
    const confirmed = monthRecords.filter(r => r.status === "confirmed");
    setUpdating("bulk-pay");
    for (const r of confirmed) {
      await base44.entities.SalesSettlement.update(r.id, { status: "paid" });
      const msg = `💰 인센티브 지급완료\n[${r.dealer_name}]: ₩${(r.commission_krw || 0).toLocaleString()}`;
      await sendTelegram(msg);
    }
    setRecords(prev => prev.map(r => (r.period || "").startsWith(month) && r.status === "confirmed" ? { ...r, status: "paid" } : r));
    setUpdating(null);
  };

  const yearMonth = new Date().toISOString().slice(0, 7);
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const m = d.toISOString().slice(0, 7);
    months.push(m);
  }

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">매출 정산</h1>
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-2 text-sm font-medium">
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "총매출", value: `₩${(totalSales / 10000).toFixed(0)}만`, color: "text-white" },
            { label: "확정매출", value: `₩${(confirmedSales / 10000).toFixed(0)}만`, color: "text-emerald-400" },
            { label: "대기중", value: `₩${(pendingSales / 10000).toFixed(0)}만`, color: "text-yellow-400" },
            { label: "지급완료", value: `₩${(paidSales / 10000).toFixed(0)}만`, color: "text-blue-400" },
          ].map(c => (
            <SFCard key={c.label} className="text-center py-3">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            </SFCard>
          ))}
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2">
          <button onClick={bulkConfirm} disabled={updating === "bulk" || monthRecords.filter(r => r.status === "pending").length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50">
            <Check className="h-4 w-4" /> 전체 확정
          </button>
          <button onClick={bulkPay} disabled={updating === "bulk-pay" || monthRecords.filter(r => r.status === "confirmed").length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50">
            <Send className="h-4 w-4" /> 전체 지급완료
          </button>
        </div>

        {/* Settlement Table */}
        <SFCard>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-emerald-500/20">
                {["딜러명", "이달매출", "인센티브율", "인센티브금액", "상태", "액션"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {monthRecords.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-600">이 월의 정산 데이터가 없습니다</td></tr>
                ) : (
                  monthRecords.map(r => (
                    <tr key={r.id} className="border-b border-emerald-500/10 hover:bg-emerald-500/5">
                      <td className="py-3 px-3 text-white font-medium">{r.dealer_name}</td>
                      <td className="py-3 px-3 text-emerald-400">₩{(r.total_sales || 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-gray-400">{r.commission_rate || 0}%</td>
                      <td className="py-3 px-3 text-emerald-300">₩{(r.commission_krw || 0).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                          r.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          r.status === "confirmed" ? "bg-emerald-500/20 text-emerald-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {r.status === "pending" ? "대기" : r.status === "confirmed" ? "확정" : "지급완료"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          {r.status === "pending" && (
                            <button onClick={() => updateRecord(r.id, "confirmed")} disabled={updating === r.id}
                              className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                              확정
                            </button>
                          )}
                          {r.status === "confirmed" && (
                            <button onClick={() => updateRecord(r.id, "paid")} disabled={updating === r.id}
                              className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] hover:bg-blue-500/30 disabled:opacity-50">
                              지급완료
                            </button>
                          )}
                          {r.status === "paid" && (
                            <span className="text-[10px] text-blue-400 font-medium">✅ 완료</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SFCard>
      </div>
    </div>
  );
}