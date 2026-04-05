import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import SFCard from "../components/SFCard";
import { Star, TrendingUp } from "lucide-react";

const LEVEL_COLORS = {
  높음: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  중간: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  낮음: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}

export default function CallInterest() {
  const me = Auth.getDealerName();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");
  const [converting, setConverting] = useState(null);
  const [convertForm, setConvertForm] = useState({});

  useEffect(() => {
    document.title = "SolFort - 관심 고객";
    base44.entities.CallLead.filter({ status: "관심있음" }, "-created_date", 200)
      .then(setLeads).finally(() => setLoading(false));
  }, []);

  const convert = async (lead) => {
    const cf = convertForm[lead.id] || {};
    setConverting(lead.id);
    await base44.entities.CallLead.update(lead.id, {
      status: "매출전환", dealer_name: cf.dealer_name || "",
      converted_at: new Date().toISOString(),
    });
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    setConverting(null); setConvertForm(p => { const n = { ...p }; delete n[lead.id]; return n; });
  };

  const filtered = leads.filter(l => levelFilter === "all" || l.interest_level === levelFilter);

  if (loading) return <Loader />;

  const highCount = leads.filter(l => l.interest_level === "높음").length;
  const midCount = leads.filter(l => l.interest_level === "중간").length;
  const totalAmount = leads.reduce((a, l) => a + (l.interest_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-400" />
        <h1 className="text-lg font-bold text-white">관심 고객</h1>
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{leads.length}명</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SFCard><p className="text-[10px] text-gray-500">높음 관심</p><p className="text-xl font-bold text-emerald-400 mt-1">{highCount}명</p></SFCard>
        <SFCard><p className="text-[10px] text-gray-500">중간 관심</p><p className="text-xl font-bold text-yellow-400 mt-1">{midCount}명</p></SFCard>
        <SFCard><p className="text-[10px] text-gray-500">예상 금액</p><p className="text-xl font-bold text-purple-400 mt-1">₩{(totalAmount/10000).toFixed(0)}만</p></SFCard>
      </div>

      <div className="flex gap-2">
        {[["all","전체"],["높음","높음"],["중간","중간"],["낮음","낮음"]].map(([v,l]) => (
          <button key={v} onClick={() => setLevelFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${levelFilter === v ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-white/5 text-gray-400"}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-center py-10 text-xs text-gray-600">관심 고객이 없습니다</p>}
        {filtered.map(lead => (
          <SFCard key={lead.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{lead.name}</span>
                  {lead.interest_level && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${LEVEL_COLORS[lead.interest_level] || "bg-white/5 text-gray-400 border-white/10"}`}>{lead.interest_level}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{lead.phone}</p>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  {lead.interest_amount > 0 && <span className="text-emerald-400">₩{lead.interest_amount.toLocaleString()}</span>}
                  {lead.next_call_date && <span className="text-yellow-400">📅 {lead.next_call_date}</span>}
                  {lead.memo && <span>{lead.memo}</span>}
                </div>
                {convertForm[lead.id]?.showConvert && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input placeholder="연결 대리점명" value={convertForm[lead.id]?.dealer_name || ""}
                      onChange={e => setConvertForm(p => ({ ...p, [lead.id]: { ...p[lead.id], dealer_name: e.target.value } }))}
                      className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs" />
                    <button onClick={() => convert(lead)} disabled={converting === lead.id}
                      className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs disabled:opacity-50">
                      {converting === lead.id ? "처리 중" : "확인"}
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setConvertForm(p => ({ ...p, [lead.id]: { ...p[lead.id], showConvert: !p[lead.id]?.showConvert } }))}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-[10px] hover:bg-purple-500/30 transition-all shrink-0">
                <TrendingUp className="h-3 w-3" /> 매출 전환
              </button>
            </div>
          </SFCard>
        ))}
      </div>
    </div>
  );
}