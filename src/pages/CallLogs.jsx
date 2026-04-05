import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import SFCard from "../components/SFCard";

const RESULT_BADGES = {
  미응답: "bg-gray-500/20 text-gray-400", 연결됨: "bg-blue-500/20 text-blue-400",
  관심없음: "bg-red-500/20 text-red-400", 관심있음: "bg-emerald-500/20 text-emerald-400",
  재콜필요: "bg-yellow-500/20 text-yellow-400",
};

const today = new Date().toISOString().split("T")[0];
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}

export default function CallLogs() {
  const me = Auth.getDealerName();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");
  const [resultFilter, setResultFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "SolFort - 콜 기록";
    base44.entities.CallLog.list("-called_at", 500).then(setLogs).finally(() => setLoading(false));
  }, []);

  const getRange = () => {
    if (dateFilter === "today") return [today, today];
    if (dateFilter === "week") return [weekAgo, today];
    return ["", ""];
  };
  const [from, to] = getRange();

  const filtered = logs.filter(l => {
    const d = (l.called_at || "").split("T")[0];
    const inRange = !from || (d >= from && d <= to);
    const matchResult = resultFilter === "all" || l.call_result === resultFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || l.lead_name?.toLowerCase().includes(q) || l.phone?.includes(q);
    return inRange && matchResult && matchSearch && l.called_by === me;
  });

  const resultCounts = logs.filter(l => l.called_by === me && (l.called_at || "").startsWith(today))
    .reduce((acc, l) => { acc[l.call_result] = (acc[l.call_result] || 0) + 1; return acc; }, {});

  if (loading) return <Loader />;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold text-white">콜 기록</h1>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {["미응답","연결됨","관심없음","관심있음","재콜필요"].map(r => (
          <SFCard key={r} className="text-center py-2">
            <p className="text-[10px] text-gray-500">{r}</p>
            <p className={`text-lg font-bold mt-0.5 ${RESULT_BADGES[r]?.replace("bg-","").replace("/20","").replace(" text-","") || "text-white"}`}>
              {resultCounts[r] || 0}
            </p>
          </SFCard>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[["today","오늘"],["week","이번주"],["all","전체"]].map(([v,l]) => (
          <button key={v} onClick={() => setDateFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${dateFilter === v ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {l}
          </button>
        ))}
        <button onClick={() => setResultFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${resultFilter === "all" ? "bg-white/10 text-white" : "bg-white/5 text-gray-400"}`}>전체</button>
        {["미응답","연결됨","관심없음","관심있음","재콜필요"].map(r => (
          <button key={r} onClick={() => setResultFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${resultFilter === r ? "bg-white/10 text-white" : "bg-white/5 text-gray-400"}`}>{r}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 검색"
          className="ml-auto bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs placeholder:text-gray-600 w-36" />
      </div>

      <p className="text-xs text-gray-600">{filtered.length}건</p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["일시","고객명","연락처","결과","통화시간","메모","재콜예정"].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-600">기록이 없습니다</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{(l.called_at || "").replace("T"," ").substring(0,16)}</td>
                <td className="py-2.5 px-2 text-white font-medium">{l.lead_name}</td>
                <td className="py-2.5 px-2 text-gray-400">{l.phone}</td>
                <td className="py-2.5 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${RESULT_BADGES[l.call_result] || "bg-white/5 text-gray-400"}`}>{l.call_result}</span>
                </td>
                <td className="py-2.5 px-2 text-gray-500">{l.call_duration || "-"}</td>
                <td className="py-2.5 px-2 text-gray-400 max-w-[120px] truncate">{l.memo || "-"}</td>
                <td className="py-2.5 px-2 text-yellow-400">{l.next_call_date || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}