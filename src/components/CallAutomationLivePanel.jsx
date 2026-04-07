import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";

const STATUS_BADGE_CALL = {
  신규: "bg-gray-500/20 text-gray-400", 연락됨: "bg-blue-500/20 text-blue-400",
  관심있음: "bg-emerald-500/20 text-emerald-400", 거절: "bg-red-500/20 text-red-400",
  매출전환: "bg-purple-500/20 text-purple-400",
};
const RESULT_BADGE_CALL = {
  미응답: "bg-gray-500/20 text-gray-400", 연결됨: "bg-blue-500/20 text-blue-400",
  관심없음: "bg-red-500/20 text-red-400", 관심있음: "bg-emerald-500/20 text-emerald-400",
  재콜필요: "bg-yellow-500/20 text-yellow-400", 매출전환: "bg-purple-500/20 text-purple-400",
};

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}

export default function CallAutomationLivePanel() {
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const todayStr = new Date().toISOString().split("T")[0];
  const timerRef = useRef(null);

  const load = () => Promise.all([
    base44.entities.CallLead.list("-created_date", 500),
    base44.entities.CallLog.list("-called_at", 200),
  ]).then(([l, lg]) => { setLeads(l); setLogs(lg); setLoading(false); });

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (loading) return <Loader />;

  const todayLogs = logs.filter(l => (l.called_at || "").startsWith(todayStr));
  const todayInterest = todayLogs.filter(l => l.call_result === "관심있음");
  const todayConverted = leads.filter(l => l.status === "매출전환" && (l.converted_at || "").startsWith(todayStr));
  const activeLeads = leads.filter(l => l.status !== "거절" && l.status !== "매출전환");
  const convertedLeads = leads.filter(l => l.status === "매출전환");
  const filteredLeads = leads.filter(l => {
    const q = search.toLowerCase();
    const ms = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.assigned_to?.toLowerCase().includes(q);
    const mf = statusFilter === "전체" || l.status === statusFilter || (statusFilter === "신규" && l.status === "new");
    return ms && mf;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">콜팀 실시간 현황</h2>
        <span className="text-[10px] text-gray-500">30초 자동 갱신</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "오늘 총 콜 수", value: todayLogs.length, color: "text-blue-400" },
          { label: "오늘 관심 고객", value: todayInterest.length, color: "text-emerald-400" },
          { label: "오늘 매출 전환", value: todayConverted.length, color: "text-purple-400" },
          { label: "전체 활성 리드", value: activeLeads.length, color: "text-yellow-400" },
        ].map(s => (
          <SFCard key={s.label}><p className="text-[10px] text-gray-500">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></SFCard>
        ))}
      </div>
      <SFCard>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">실시간 콜 기록 피드 (최근 20건)</h3>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-600 py-4 text-center">콜 기록 없음</p>
        ) : (
          <div className="space-y-0 max-h-64 overflow-y-auto">
            {logs.slice(0, 20).map(l => (
              <div key={l.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0 text-xs">
                <span className="text-gray-600 text-[10px] w-20 shrink-0">{(l.called_at || "").replace("T", " ").substring(0, 16)}</span>
                <span className="text-blue-400 shrink-0 w-16 truncate">{l.called_by}</span>
                <span className="text-white flex-1 font-medium truncate">{l.lead_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${RESULT_BADGE_CALL[l.call_result] || "bg-white/5 text-gray-400"}`}>{l.call_result}</span>
              </div>
            ))}
          </div>
        )}
      </SFCard>
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">리드 현황 ({filteredLeads.length}건)</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 / 연락처 / 담당자 검색"
            className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
          {["전체", "신규", "연락됨", "관심있음", "거절", "매출전환"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>{s}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["등록일", "고객명", "연락처", "담당자", "상태", "관심도", "관심금액", "다음콜"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredLeads.slice(0, 100).map(l => (
                <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{(l.created_at || l.created_date || "").split("T")[0]}</td>
                  <td className="py-2.5 px-2 text-white font-medium">{l.name}</td>
                  <td className="py-2.5 px-2 text-gray-400">{l.phone}</td>
                  <td className="py-2.5 px-2 text-gray-500">{l.assigned_to || "-"}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_BADGE_CALL[l.status] || "bg-white/5 text-gray-400"}`}>{l.status === "new" ? "신규" : l.status}</span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-400">{l.interest_level || "-"}</td>
                  <td className="py-2.5 px-2 text-emerald-400">{l.interest_amount ? `₩${Number(l.interest_amount).toLocaleString()}` : "-"}</td>
                  <td className="py-2.5 px-2 text-yellow-400">{l.next_call_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {convertedLeads.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">매출 전환 현황 ({convertedLeads.length}건)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["전환일", "고객명", "담당자", "연결 대리점", "관심 금액"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {convertedLeads.map(l => (
                  <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2 text-gray-500">{(l.converted_at || "").split("T")[0]}</td>
                    <td className="py-2.5 px-2 text-white font-medium">{l.name}</td>
                    <td className="py-2.5 px-2 text-gray-400">{l.assigned_to || "-"}</td>
                    <td className="py-2.5 px-2 text-blue-400">{l.dealer_name || "-"}</td>
                    <td className="py-2.5 px-2 text-emerald-400">{l.interest_amount ? `₩${Number(l.interest_amount).toLocaleString()}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}