import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Star, Phone } from "lucide-react";

const INTEREST_ORDER = { 높음: 0, 중간: 1, 낮음: 2 };
const INTEREST_STYLE = {
  높음: { badge: "bg-red-500/20 text-red-400 border-red-500/30", icon: "🔥" },
  중간: { badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: "⭐" },
  낮음: { badge: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: "" },
};

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallInterest() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("전체");
  const [timelineModal, setTimelineModal] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    document.title = "SolFort - 관심 고객";
    base44.entities.CallLead.filter({ status: "관심있음" }, "-created_date", 300)
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const lo = (INTEREST_ORDER[a.interest_level] ?? 2) - (INTEREST_ORDER[b.interest_level] ?? 2);
          if (lo !== 0) return lo;
          return (b.interest_amount || 0) - (a.interest_amount || 0);
        });
        setLeads(sorted);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l => levelFilter === "전체" || l.interest_level === levelFilter);
  const totalAmount = filtered.reduce((a, l) => a + (l.interest_amount || 0), 0);

  const openTimeline = async (lead) => {
    setTimelineModal(lead);
    setLoadingTimeline(true);
    try {
      const [logs, memos] = await Promise.all([
        base44.entities.CallLog.list("-called_at", 500),
        base44.entities.FollowupMemo?.list?.("-created_date", 500) || Promise.resolve([])
      ]);
      const leadLogs = logs.filter(l => l.lead_id === lead.id);
      const leadMemos = memos.filter(m => m.lead_id === lead.id);
      const events = [
        ...leadLogs.map(l => ({ type: 'call', icon: '📞', color: 'blue', date: l.called_at, text: l.call_result + (l.memo ? ' - ' + l.memo : ''), by: l.called_by })),
        ...leadMemos.map(m => ({ type: 'memo', icon: '💬', color: 'gray', date: m.created_at, text: m.memo, by: m.created_by }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTimeline(events);
    } catch (e) {
      setTimeline([]);
    }
    setLoadingTimeline(false);
  };

  if (loading) return <><CallNav /><Loader /></>;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-yellow-400" />
          <h1 className="text-lg font-bold text-white">관심 고객</h1>
          <span className="text-sm bg-yellow-500/20 text-yellow-400 px-2.5 py-0.5 rounded-full">총 {leads.length}명</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "🔥 높음", value: leads.filter(l=>l.interest_level==="높음").length, color: "text-red-400" },
            { label: "⭐ 중간", value: leads.filter(l=>l.interest_level==="중간").length, color: "text-yellow-400" },
            { label: "예상 금액", value: "₩" + (totalAmount/10000).toFixed(0) + "만", color: "text-emerald-400" },
          ].map(s => (
            <SFCard key={s.label} className="text-center py-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </SFCard>
          ))}
        </div>

        <div className="flex gap-2">
          {["전체","높음","중간","낮음"].map(v => (
            <button key={v} onClick={() => setLevelFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${levelFilter === v ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-white/5 text-gray-500"}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {filtered.length === 0 && <p className="col-span-2 text-center py-12 text-xs text-gray-600">관심 고객이 없습니다</p>}
          {filtered.map(lead => {
            const iStyle = INTEREST_STYLE[lead.interest_level] || INTEREST_STYLE.낮음;
            return (
              <SFCard key={lead.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{lead.name}</span>
                      {lead.interest_level && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${iStyle.badge}`}>{iStyle.icon} {lead.interest_level}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{lead.phone}</p>
                    {lead.interest_amount > 0 && (
                      <p className="text-sm text-emerald-400 font-semibold mt-1">₩{Number(lead.interest_amount).toLocaleString()}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${lead.next_call_date ? "text-yellow-400" : "text-red-400"}`}>
                      📅 {lead.next_call_date || "재콜일 미지정"}
                    </p>
                    {lead.memo && <p className="text-[10px] text-gray-600 mt-1 truncate">{lead.memo}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  <button onClick={() => openTimeline(lead)}
                    className="flex-1 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] hover:bg-blue-500/30 transition-all">
                    전체 이력
                  </button>
                  <button onClick={() => navigate("/call/logs")}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 text-gray-400 rounded-lg text-[10px] hover:bg-white/10 transition-all">
                    <Phone className="h-3 w-3" /> 콜 기록
                  </button>
                  <button onClick={() => navigate("/call/convert", { state: { lead } })}
                    className="flex-1 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] hover:bg-emerald-500/30 transition-all">
                    매출 등록
                  </button>
                </div>
              </SFCard>
            );
          })}
        </div>
      </div>

      {timelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md max-h-96 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">[{timelineModal.name}] 전체 이력</h3>
              <button onClick={() => setTimelineModal(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingTimeline ? (
                <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>
              ) : timeline.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">이력이 없습니다</p>
              ) : (
                timeline.map((event, i) => (
                  <div key={i} className="border-l-2 border-gray-600 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{event.icon}</span>
                      <span className="text-xs text-gray-500">{moment(event.date).fromNow()}</span>
                      <span className="text-[10px] text-gray-600 ml-auto">{event.by}</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">{event.text}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-white/[0.06]">
              <button onClick={() => setTimelineModal(null)} className="w-full py-2 bg-white/5 text-gray-400 rounded-lg text-xs hover:bg-white/10 transition-all">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}