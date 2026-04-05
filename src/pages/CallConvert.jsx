import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "../components/SFCard";
import { TrendingUp } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-01`;

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}

export default function CallConvert() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    document.title = "SolFort - 매출 연결";
    base44.entities.CallLead.filter({ status: "매출전환" }, "-converted_at", 500)
      .then(setLeads).finally(() => setLoading(false));
  }, []);

  const getRange = () => {
    if (period === "today") return [today, today];
    if (period === "month") return [monthStart, today];
    return ["", ""];
  };
  const [from, to] = getRange();
  const filtered = leads.filter(l => {
    const d = (l.converted_at || "").split("T")[0];
    return !from || (d >= from && d <= to);
  });

  const totalAmount = filtered.reduce((a, l) => a + (l.interest_amount || 0), 0);
  const byDealer = Object.values(filtered.reduce((acc, l) => {
    const k = l.dealer_name || "미지정";
    acc[k] = acc[k] || { dealer: k, count: 0, amount: 0 };
    acc[k].count += 1; acc[k].amount += l.interest_amount || 0;
    return acc;
  }, {})).sort((a, b) => b.count - a.count);

  if (loading) return <Loader />;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-purple-400" />
        <h1 className="text-lg font-bold text-white">매출 연결 현황</h1>
      </div>

      <div className="flex gap-2">
        {[["today","오늘"],["month","이번달"],["all","전체"]].map(([v,l]) => (
          <button key={v} onClick={() => setPeriod(v)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${period === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>{l}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SFCard><p className="text-[10px] text-gray-500">전환 건수</p><p className="text-2xl font-bold text-purple-400 mt-1">{filtered.length}건</p></SFCard>
        <SFCard><p className="text-[10px] text-gray-500">예상 매출 합계</p><p className="text-2xl font-bold text-emerald-400 mt-1">₩{(totalAmount/10000).toFixed(0)}만</p></SFCard>
      </div>

      {byDealer.length > 0 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">대리점별 전환</h3>
          <div className="space-y-2">
            {byDealer.map(d => (
              <div key={d.dealer} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                <span className="flex-1 text-sm text-white">{d.dealer}</span>
                <span className="text-xs text-gray-400">{d.count}건</span>
                <span className="text-xs text-emerald-400">₩{d.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SFCard>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["전환일","고객명","연락처","관심금액","연결 대리점","등록자"].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-600">매출 전환 내역이 없습니다</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{(l.converted_at || "").split("T")[0]}</td>
                <td className="py-2.5 px-2 text-white font-medium">{l.name}</td>
                <td className="py-2.5 px-2 text-gray-400">{l.phone}</td>
                <td className="py-2.5 px-2 text-emerald-400">{l.interest_amount ? `₩${l.interest_amount.toLocaleString()}` : "-"}</td>
                <td className="py-2.5 px-2 text-blue-400">{l.dealer_name || "-"}</td>
                <td className="py-2.5 px-2 text-gray-500">{l.created_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}