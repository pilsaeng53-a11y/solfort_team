import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Flame } from "lucide-react";
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
  const [activeEvents, setActiveEvents] = useState([]);
  const [sentRecalls, setSentRecalls] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);
  const [user, setUser] = useState(null);
  const [workStatus, setWorkStatus] = useState("not_checked");
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [sevenDayHistory, setSevenDayHistory] = useState([]);

  useEffect(() => {
    document.title = "SolFort - 콜 대시보드";
    loadUser();
    load();
    base44.entities.Event.list("-created_date", 50)
      .then(evs => setActiveEvents(evs.filter(e => e.is_active && (e.target === "전체" || e.target === "콜팀"))))
      .catch(() => {});
  }, []);

  const loadUser = async () => {
    const u = await base44.auth.me();
    setUser(u);
    if (u?.id) loadAttendance(u);
  };

  const loadAttendance = async (currentUser) => {
    if (!currentUser?.id) return;
    const todayStr = today;
    const statusKey = `sf_work_status_${currentUser.id}_${todayStr}`;
    const statusData = JSON.parse(localStorage.getItem(statusKey) || '{}');

    // Load today's logs
    const todayLogs = await base44.entities.AttendanceLog.filter(
      { username: currentUser.username, work_date: todayStr },
      "created_date",
      10
    ).catch(() => []);

    const checkInLog = todayLogs.find(l => l.type === "출근");
    const checkOutLog = todayLogs.find(l => l.type === "퇴근");

    if (checkInLog) {
      setCheckInTime(checkInLog.time);
      setWorkStatus(checkOutLog ? "checked_out" : "checked_in");
    } else {
      setWorkStatus("not_checked");
    }

    if (checkOutLog) {
      setCheckOutTime(checkOutLog.time);
    }

    // Load 7-day history
    const allLogs = await base44.entities.AttendanceLog.filter(
      { username: currentUser.username },
      "-work_date",
      100
    ).catch(() => []);

    const historyMap = {};
    allLogs.forEach(log => {
      const date = log.work_date;
      if (!historyMap[date]) {
        historyMap[date] = { date, checkIn: null, checkOut: null };
      }
      if (log.type === "출근") historyMap[date].checkIn = log.time;
      if (log.type === "퇴근") historyMap[date].checkOut = log.time;
    });

    const history = Object.values(historyMap).slice(0, 7).map(h => {
      const checkIn = h.checkIn ? new Date(`2000-01-01T${h.checkIn}`) : null;
      const checkOut = h.checkOut ? new Date(`2000-01-01T${h.checkOut}`) : null;
      let workingHours = 0, workingMins = 0, status = "결근";
      if (checkIn && checkOut) {
        const diff = (checkOut - checkIn) / 1000 / 60;
        workingHours = Math.floor(diff / 60);
        workingMins = diff % 60;
        const checkInHour = parseInt(h.checkIn?.split(":")[0] || "09");
        status = checkInHour > 9 ? "지각" : "정상";
      } else if (checkIn && !checkOut) {
        status = "조퇴";
      }
      return { ...h, workingHours, workingMins, status };
    });
    setSevenDayHistory(history);
  };

  const handleCheckIn = async () => {
    if (!user?.id) return;
    setCheckingIn(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      await base44.entities.AttendanceLog.create({
        username: user.username,
        user_id: user.id,
        work_date: today,
        type: "출근",
        time: timeStr,
        member_name: user.full_name || user.username,
      });
      setCheckInTime(timeStr);
      setWorkStatus("checked_in");
      const statusKey = `sf_work_status_${user.id}_${today}`;
      localStorage.setItem(statusKey, JSON.stringify({ checkIn: timeStr }));
    } catch (e) {
      console.error("Check-in failed", e);
    }
    setCheckingIn(false);
  };

  const handleCheckOut = async () => {
    if (!user?.id) return;
    setCheckingIn(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      await base44.entities.AttendanceLog.create({
        username: user.username,
        user_id: user.id,
        work_date: today,
        type: "퇴근",
        time: timeStr,
        member_name: user.full_name || user.username,
      });
      setCheckOutTime(timeStr);
      setWorkStatus("checked_out");
      const statusKey = `sf_work_status_${user.id}_${today}`;
      localStorage.setItem(statusKey, JSON.stringify({ checkIn: checkInTime, checkOut: timeStr }));
      await loadAttendance(user);
    } catch (e) {
      console.error("Check-out failed", e);
    }
    setCheckingIn(false);
  };

  // Update elapsed time
  useEffect(() => {
    if (workStatus !== "checked_in" || !checkInTime) return;
    const timer = setInterval(() => {
      const [h, m] = checkInTime.split(":").map(Number);
      const checkInDate = new Date();
      checkInDate.setHours(h, m, 0);
      const now = new Date();
      const diff = Math.floor((now - checkInDate) / 1000 / 60);
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      setElapsedTime(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [workStatus, checkInTime]);



  useEffect(() => {
    const sendRecallAlerts = async () => {
      const flagKey = `recall_sent_today_${today}`;
      if (sessionStorage.getItem(flagKey)) return;
      const stored = JSON.parse(localStorage.getItem('sf_dealer') || '{}');
      const userName = stored.name || stored.dealer_name || '담당자';
      const recallLeads = await base44.entities.CallLead.filter({ next_call_date: today, status: '재콜예정' }, '-created_date', 100).catch(() => []);
      if (recallLeads.length === 0) return;
      const BOT_TOKEN = '8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8';
      const CHAT_ID = '5757341051';
      const sent = [];
      for (const lead of recallLeads) {
        const text = `🔔 재콜 알림\n고객: ${lead.name}\n연락처: ${lead.phone}\n담당: ${userName}`;
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, text }),
        }).catch(() => {});
        sent.push(lead);
      }
      sessionStorage.setItem(flagKey, 'true');
      setSentRecalls(sent);
    };
    if (!loading) sendRecallAlerts();
  }, [loading]);

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
        {/* Attendance System */}
        {user && (
          <div className="space-y-4">
            {/* Checkin/Checkout Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCheckIn}
                disabled={workStatus !== "not_checked" || checkingIn}
                className={`py-4 rounded-xl font-bold text-sm transition-all ${
                  workStatus !== "not_checked"
                    ? "bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 animate-pulse"
                }`}
              >
                🟢 출근
              </button>
              <button
                onClick={handleCheckOut}
                disabled={workStatus !== "checked_in" || checkingIn}
                className={`py-4 rounded-xl font-bold text-sm transition-all ${
                  workStatus !== "checked_in"
                    ? "bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed"
                    : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 animate-pulse"
                }`}
              >
                🔴 퇴근
              </button>
            </div>

            {/* Today Status */}
            {(checkInTime || checkOutTime) && (
              <SFCard className="bg-emerald-500/5 border border-emerald-500/20">
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    {checkInTime && <span>출근 {checkInTime}</span>}
                    {checkOutTime && <span className="ml-3">퇴근 {checkOutTime}</span>}
                  </p>
                  {workStatus === "checked_in" && (
                    <p className="text-emerald-400 font-semibold">근무중 {elapsedTime}</p>
                  )}
                  {checkOutTime && checkInTime && (
                    <p className="text-gray-400">
                      근무시간 {Math.floor((new Date(`2000-01-01T${checkOutTime}`) - new Date(`2000-01-01T${checkInTime}`)) / 1000 / 60 / 60)}h {Math.floor(((new Date(`2000-01-01T${checkOutTime}`) - new Date(`2000-01-01T${checkInTime}`)) / 1000 / 60) % 60)}m
                    </p>
                  )}
                </div>
              </SFCard>
            )}

            {/* 7-Day History */}
            <SFCard className="border border-white/10">
              <h3 className="text-xs font-semibold text-gray-400 mb-3">📅 최근 7일 출퇴근 기록</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/10">
                      {["날짜", "출근", "퇴근", "근무", "상태"].map(h => (
                        <th key={h} className="text-left py-2 px-1 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sevenDayHistory.map(h => (
                      <tr key={h.date} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 px-1 text-gray-400">{h.date}</td>
                        <td className="py-2 px-1 text-gray-300">{h.checkIn || "-"}</td>
                        <td className="py-2 px-1 text-gray-300">{h.checkOut || "-"}</td>
                        <td className="py-2 px-1 text-gray-300">{h.workingHours > 0 ? `${h.workingHours}h ${h.workingMins}m` : "-"}</td>
                        <td className={`py-2 px-1 font-semibold ${
                          h.status === "정상" ? "text-emerald-400" :
                          h.status === "지각" ? "text-yellow-400" :
                          h.status === "조퇴" ? "text-orange-400" :
                          "text-red-400"
                        }`}>{h.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SFCard>
          </div>
        )}
        {/* Active Events */}
        {activeEvents.length > 0 && (
          <div className="space-y-2">
            {activeEvents.map(ev => (
              <div key={ev.id} className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm font-bold text-white">{ev.title}</p>
                <p className="text-xs text-gray-300 mt-1 whitespace-pre-line">{ev.content}</p>
                <p className="text-[10px] text-blue-400/70 mt-2">{ev.start_date} ~ {ev.end_date}</p>
              </div>
            ))}
          </div>
        )}

        {/* 재콜 알림 전송 현황 */}
        {sentRecalls.length > 0 && (
          <SFCard className="border border-orange-500/30 bg-orange-500/5">
            <p className="text-xs font-semibold text-orange-400 mb-2">📅 오늘 재콜 자동 알림 전송완료 ({sentRecalls.length}건)</p>
            <div className="space-y-1">
              {sentRecalls.map(l => (
                <div key={l.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-white font-medium">{l.name}</span>
                  <span className="text-gray-500">{l.phone}</span>
                  <span className="text-orange-400 text-[10px] ml-auto">✅ 알림전송</span>
                </div>
              ))}
            </div>
          </SFCard>
        )}

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

        {/* 콜 성공률 히트맵 */}
        <CallHeatmap logs={logs} />
      </div>
    </div>
  );
}

function CallHeatmap({ logs }) {
  const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Build grid[dayIndex 0=Mon][hour] = {total, success}
  const grid = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ total: 0, success: 0 }))
  );

  logs.forEach(l => {
    if (!l.called_at) return;
    const d = new Date(l.called_at);
    const dow = (d.getDay() + 6) % 7; // 0=Mon
    const hour = d.getHours();
    grid[dow][hour].total += 1;
    if (l.call_result === '전환완료') grid[dow][hour].success += 1;
  });

  const cellColor = (total) => {
    if (total === 0) return 'bg-gray-900';
    if (total <= 2) return 'bg-emerald-900';
    if (total <= 5) return 'bg-emerald-700';
    return 'bg-emerald-500';
  };

  const [tooltip, setTooltip] = useState(null);

  return (
    <SFCard>
      <h3 className="text-sm font-semibold text-white mb-4">📊 요일×시간대 콜 히트맵</h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour labels */}
          <div className="flex mb-1 ml-6">
            {HOURS.map(h => (
              <div key={h} className="w-5 shrink-0 text-center text-[8px] text-gray-600">
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center mb-0.5">
              <span className="text-[10px] text-gray-500 w-6 shrink-0 text-center">{day}</span>
              {HOURS.map(h => {
                const cell = grid[di][h];
                return (
                  <div
                    key={h}
                    className={`w-5 h-5 shrink-0 rounded-sm cursor-pointer ${cellColor(cell.total)} relative`}
                    onMouseEnter={() => setTooltip({ di, h, ...cell })}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {tooltip && tooltip.di === di && tooltip.h === h && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 bg-gray-800 border border-white/10 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                        {cell.total}건 / 성공{cell.success}건
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 ml-6">
            {[['bg-gray-900','0건'],['bg-emerald-900','1-2건'],['bg-emerald-700','3-5건'],['bg-emerald-500','6건+']].map(([cls, lbl]) => (
              <div key={lbl} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${cls}`} />
                <span className="text-[9px] text-gray-500">{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SFCard>
  );
}