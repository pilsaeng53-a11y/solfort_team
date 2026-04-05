import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import SFCard from "../components/SFCard";
import { Users, Phone, Star, TrendingUp, Calendar, Clock } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const RESULT_COLORS = {
  미응답: "text-gray-400", 연결됨: "text-blue-400", 관심없음: "text-red-400",
  관심있음: "text-emerald-400", 재콜필요: "text-yellow-400",
};

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}

export default function CallDashboard() {
  const navigate = useNavigate();
  const me = Auth.getDealerName();
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "SolFort - 콜 대시보드";
    Promise.all([
      base44.entities.CallLead.list("-created_date", 500),
      base44.entities.CallLog.list("-called_at", 100),
    ]).then(([l, lg]) => { setLeads(l); setLogs(lg); setLoading(false); });
  }, []);

  if (loading) return <Loader />;

  const myLeads = leads.filter(l => l.assigned_to === me || !l.assigned_to);
  const todayLeads = leads.filter(l => (l.created_at || "").startsWith(today));
  const todayLogs = logs.filter(l => (l.called_at || "").startsWith(today) && l.called_by === me);
  const interestLeads = myLeads.filter(l => l.status === "관심있음");
  const converted = leads.filter(l => l.status === "매출전환" && (l.converted_at || "").startsWith(today));
  const todayCallbacks = myLeads.filter(l => l.next_call_date === today);

  const stats = [
    { label: "오늘 신규 리드", value: todayLeads.length, icon: Users, color: "text-blue-400", path: "/call/leads" },
    { label: "오늘 콜 기록", value: todayLogs.length, icon: Phone, color: "text-emerald-400", path: "/call/logs" },
    { label: "관심 고객", value: interestLeads.length, icon: Star, color: "text-yellow-400", path: "/call/interest" },
    { label: "오늘 매출전환", value: converted.length, icon: TrendingUp, color: "text-purple-400", path: "/call/convert" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-white">안녕하세요, {me} 님 👋</h1>
        <p className="text-xs text-gray-500 mt-0.5">{today} 기준 나의 현황</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <SFCard key={s.label} className="cursor-pointer hover:border-white/10 transition-all" onClick={() => navigate(s.path)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <Icon className={`h-4 w-4 ${s.color} opacity-60 mt-1`} />
              </div>
            </SFCard>
          );
        })}
      </div>

      {todayCallbacks.length > 0 && (
        <SFCard className="border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-yellow-400">오늘 재콜 예정 {todayCallbacks.length}건</h3>
          </div>
          <div className="space-y-2">
            {todayCallbacks.slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{l.name}</p>
                  <p className="text-[10px] text-gray-500">{l.phone}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${l.interest_level === "높음" ? "bg-emerald-500/20 text-emerald-400" : l.interest_level === "중간" ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-gray-400"}`}>
                  {l.interest_level || "미설정"}
                </span>
                <button onClick={() => navigate("/call/leads")} className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">콜하기</button>
              </div>
            ))}
          </div>
        </SFCard>
      )}

      <SFCard>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-400">최근 콜 기록</h3>
        </div>
        {todayLogs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">오늘 콜 기록이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {todayLogs.slice(0, 8).map(l => (
              <div key={l.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0 text-xs">
                <span className="text-gray-600 text-[10px] w-12 shrink-0">{(l.called_at || "").substring(11, 16)}</span>
                <span className="text-white flex-1 font-medium">{l.lead_name}</span>
                <span className={RESULT_COLORS[l.call_result] || "text-gray-400"}>{l.call_result}</span>
                {l.call_duration && <span className="text-gray-600">{l.call_duration}</span>}
              </div>
            ))}
          </div>
        )}
      </SFCard>
    </div>
  );
}