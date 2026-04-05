import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Phone, TrendingUp, Users, Star, RefreshCw, Clock, Calendar } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const RESULT_BADGE = {
  미응답: "bg-gray-500/20 text-gray-400",
  연결됨: "bg-blue-500/20 text-blue-400",
  관심없음: "bg-red-500/20 text-red-400",
  관심있음: "bg-emerald-500/20 text-emerald-400",
  재콜필요: "bg-yellow-500/20 text-yellow-400",
  매출전환: "bg-purple-500/20 text-purple-400",
};

function Loader() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"/>
    </div>
  );
}

export default function CallDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    document.title = "SolFort - 콜 대시보드";
    load();
  }, []);

  const load = () =>
    Promise.all([
      base44.entities.CallLead.list("-created_date", 500),
      base44.entities.CallLog.list("-called_at", 100),
      base44.entities.SalesRecord.list("-created_date", 1000),
    ]).then(([l, lg, s]) => { setLeads(l); setLogs(lg); setSales(s); setLoading(false); });

  const thisMonth = today.slice(0, 7);
  const todayLogs = logs.filter(l => (l.called_at || "").startsWith(today));
  const todayConnected = todayLogs.filter(l => l.call_result === "연결됨");
  const todayTaggedLeads = leads.filter(l => (l.created_at || "").startsWith(today));
  const blueToday = todayTaggedLeads.filter(l => l.color_tag === "blue").length;
  const yellowToday = todayTaggedLeads.filter(l => l.color_tag === "yellow").length;
  const redToday = todayTaggedLeads.filter(l => l.color_tag === "red").length;
  const noneToday = todayTaggedLeads.filter(l => !l.color_tag).length;
  const todayConverted = leads.filter(l => l.status === "매출전환" && (l.converted_at || "").startsWith(today));
  const totalLeads = leads.length;
  const interestLeads = leads.filter(l => l.status === "관심있음");
  const allConverted = leads.filter(l => l.status === "매출전환");
  const conversionRate = totalLeads > 0 ? ((allConverted.length / totalLeads) * 100).toFixed(1) : "0.0";
  const todayCallbacks = leads.filter(l => l.next_call_date === today && l.status !== "매출전환");
  
  // Feature 1: Today briefing
  const bookmarkedLeads = leads.filter(l => l.is_bookmarked);
  const todayRecalls = todayCallbacks.length;
  const monthSales = sales.filter(s => s.sale_date?.startsWith(thisMonth)).reduce((a, s) => a + (s.sales_amount || 0), 0);
  
  // Feature 4: Urgent call
  const urgentLead = leads
    .filter(l => l.status === "재콜예정" && l.next_call_date)
    .sort((a, b) => new Date(a.next_call_date) - new Date(b.next_call_date))[0];
  
  const updateUrgentDate = async (leadId, newDate) => {
    await base44.entities.CallLead.update(leadId, { next_call_date: newDate });
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, next_call_date: newDate } : l));
  };

  if (loading) return <><CallNav /><Loader/></>;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav/>
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
        {/* Feature 1: Today Briefing */}
        <SFCard className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center gap-4">
              <div>오늘 재콜: <span className="font-bold text-emerald-400 text-sm">{todayRecalls}명</span></div>
              <div>즐겨찾기: <span className="font-bold text-yellow-400 text-sm">{bookmarkedLeads.length}명</span></div>
              <div>오늘 콜: <span className="font-bold text-blue-400 text-sm">{todayLogs.length}건</span></div>
              <div>이달 매출: <span className="font-bold text-purple-400 text-sm">₩{(monthSales / 10000).toFixed(0)}만</span></div>
            </div>
          </div>
        </SFCard>

        {/* Feature 4: Urgent Call Alert */}
        {urgentLead && (
          <SFCard className="border border-red-500/20 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-400 font-semibold">⚡ 지금 바로 연락하세요!</p>
                <p className="text-sm font-bold text-white mt-1">{urgentLead.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{urgentLead.phone} · 📅 {urgentLead.next_call_date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate("/call/logs")}
                  className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-all whitespace-nowrap">
                  콜기록추가
                </button>
                <button onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  updateUrgentDate(urgentLead.id, tomorrow.toISOString().split('T')[0]);
                }}
                  className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1.5 rounded-lg hover:bg-yellow-500/30 transition-all">
                  다음으로미루기
                </button>
              </div>
            </div>
          </SFCard>
        )}

        {/* Feature 1: Bookmarked leads */}
        {bookmarkedLeads.length > 0 && (
          <SFCard className="border border-yellow-500/20">
            <h3 className="text-sm font-semibold text-yellow-400 mb-3">⭐ 즐겨찾기 고객 ({bookmarkedLeads.length}명)</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {bookmarkedLeads.slice(0, 6).map(l => (
                <div key={l.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-white truncate">{l.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{l.phone}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">{l.status}</span>
                    <button onClick={() => navigate("/call/logs")}
                      className="text-[10px] text-blue-400 hover:text-blue-300">콜기록추가</button>
                  </div>
                </div>
              ))}
            </div>
          </SFCard>
        )}
        
        {/* KPI 카드 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">오늘의 현황</h2>
            <button onClick={load} className="text-gray-500 hover:text-gray-300 transition-all">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "오늘 콜 수", value: todayLogs.length, icon: Phone, color: "text-blue-400", sub: "총 통화 시도" },
              { label: "오늘 연결 수", value: todayConnected.length, icon: Users, color: "text-emerald-400", sub: "실제 연결" },
              { label: "오늘 매출 전환", value: todayConverted.length, icon: TrendingUp, color: "text-purple-400", sub: "전환 완료" },
            ].map(s => {
              const Icon = s.icon;
              return (
                <SFCard key={s.label} glow>
                  <div className="flex items-start justify-between mb-1">
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className={`text-2xl md:text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                  <p className="text-[9px] text-gray-600">{s.sub}</p>
                </SFCard>
              );
            })}
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "총 리드 수", value: totalLeads + "명", color: "text-white" },
            { label: "관심 고객", value: interestLeads.length + "명", color: "text-yellow-400" },
            { label: "전환율", value: conversionRate + "%", color: "text-emerald-400" },
          ].map(s => (
            <SFCard key={s.label} className="text-center py-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </SFCard>
          ))}
        </div>

        {/* 오늘 재콜 예정 */}
        {todayCallbacks.length > 0 && (
          <SFCard className="border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-yellow-400" />
              <h3 className="text-sm font-semibold text-yellow-400">오늘 재콜 예정 ({todayCallbacks.length}건)</h3>
            </div>
            <div className="space-y-2">
              {todayCallbacks.slice(0, 6).map(l => (
                <div key={l.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{l.name}</p>
                    <p className="text-[10px] text-gray-500">{l.phone}</p>
                  </div>
                  {l.interest_level && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      l.interest_level === "높음" ? "bg-red-500/20 text-red-400" :
                      l.interest_level === "중간" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>
                      {l.interest_level === "높음" ? "🔥" : l.interest_level === "중간" ? "⭐" : ""} {l.interest_level}
                    </span>
                  )}
                  <button
                    onClick={() => navigate("/call/logs")}
                    className="shrink-0 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/30 transition-all"
                  >
                    콜기록추가
                  </button>
                </div>
              ))}
            </div>
          </SFCard>
        )}

        {/* 오늘 콜 결과 색상 집계 */}
        <SFCard className="border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">오늘 콜 결과</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: "🔵", label: "거절", count: blueToday, color: "text-blue-400" },
              { icon: "🟡", label: "가망", count: yellowToday, color: "text-yellow-400" },
              { icon: "🔴", label: "수낙", count: redToday, color: "text-red-400" },
              { icon: "⚪", label: "미처리", count: noneToday, color: "text-gray-400" },
            ].map(s => (
              <div key={s.label} className="text-center py-2">
                <p className="text-xl">{s.icon}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        </SFCard>

        {/* 최근 콜 기록 피드 */}
        <SFCard>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-300">최근 콜 기록</h3>
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-gray-600 py-6 text-center">콜 기록이 없습니다</p>
          ) : (
            <div className="space-y-0">
              {logs.slice(0, 10).map(l => (
                <div key={l.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0 text-xs">
                  <span className="text-gray-600 text-[10px] w-10 shrink-0">{(l.called_at || "").substring(11, 16)}</span>
                  <span className="text-white font-medium flex-1 truncate">{l.lead_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${RESULT_BADGE[l.call_result] || "bg-white/5 text-gray-400"}`}>{l.call_result}</span>
                  {l.memo && <span className="text-gray-600 text-[10px] truncate max-w-[100px] hidden md:block">{l.memo}</span>}
                </div>
              ))}
            </div>
          )}
        </SFCard>
      </div>
    </div>
  );
}