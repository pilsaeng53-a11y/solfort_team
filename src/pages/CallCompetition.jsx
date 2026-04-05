import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";

const today = new Date().toISOString().split("T")[0];
const currentMonth = today.slice(0, 7);
const monthStart = `${currentMonth}-01`;

export default function CallCompetition() {
  const [salesData, setSalesData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const load = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const records = await base44.entities.SalesRecord.list("-created_date", 5000);
      const monthRecords = records.filter(r => r.sale_date >= monthStart && r.sale_date <= today && r.from_call_team);
      setSalesData(monthRecords);
      setLoading(false);
    } catch (e) {
      console.error("Failed to load data:", e);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (loading) return <Loader />;

  // Group by from_call_team
  const grouped = Object.values(
    salesData.reduce((acc, r) => {
      const team = r.from_call_team;
      acc[team] = acc[team] || { team, totalAmount: 0, count: 0 };
      acc[team].totalAmount += r.sales_amount || 0;
      acc[team].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.totalAmount - a.totalAmount);

  // Amount ranking (top 3)
  const amountRanking = grouped;
  const top3Names = amountRanking.slice(0, 3).map(a => a.team);

  // Encourage ranking (top 3 excluding top3 from amount)
  const encourageRanking = grouped.filter(a => !top3Names.includes(a.team)).sort((a, b) => b.count - a.count).slice(0, 3);

  // Current user info
  const userTeam = currentUser?.username;
  const userAmountRank = amountRanking.findIndex(a => a.team === userTeam) + 1;
  const userAmountData = amountRanking.find(a => a.team === userTeam);
  const userAmount = userAmountData?.totalAmount || 0;
  const firstAmount = amountRanking[0]?.totalAmount || 0;
  const gapToFirst = firstAmount - userAmount;

  // Streak calculation (consecutive sales days this month)
  const daysWithSales = new Set(salesData.filter(r => r.from_call_team === userTeam).map(r => r.sale_date));
  let streak = 0;
  let checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (daysWithSales.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const getMedalIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const getStreakBadge = () => {
    if (streak >= 30) return { icon: "💎", label: "다이아전설", color: "text-blue-400" };
    if (streak >= 14) return { icon: "⚡", label: "번개기록", color: "text-yellow-400" };
    if (streak >= 7) return { icon: "🔥", label: "불꽃주간", color: "text-red-400" };
    return { icon: "🔥", label: `${streak}일`, color: "text-orange-400" };
  };

  const streakBadge = getStreakBadge();

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="sticky top-0 z-10 bg-[#080a12] border-b border-white/[0.06] px-4 py-4">
        <h1 className="text-xl font-bold text-white">🏆 {currentMonth} 콜팀 경쟁</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        {/* 금액 리더보드 */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">💰 금액 리더보드</h2>
          <div className="space-y-2">
            {amountRanking.map((rank, i) => {
              const isCurrentUser = rank.team === userTeam;
              const bgClass = i === 0 ? "bg-yellow-500/20 border-l-4 border-yellow-400" : i === 1 ? "bg-gray-400/10 border-l-4 border-gray-300" : i === 2 ? "bg-orange-700/20 border-l-4 border-orange-600" : "bg-white/5 border-l-4 border-transparent";
              return (
                <div
                  key={rank.team}
                  className={`p-4 rounded-lg border transition-all ${bgClass} ${isCurrentUser ? "ring-2 ring-emerald-400" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-white w-8">{getMedalIcon(i + 1)}</span>
                      <div>
                        <p className={`text-sm font-bold ${isCurrentUser ? "text-emerald-400" : "text-white"}`}>
                          {rank.team} {isCurrentUser ? "👈 나" : ""}
                        </p>
                        <p className="text-xs text-gray-500">{rank.count}건</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-white">₩{rank.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {userAmountData && (
            <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] text-xs text-gray-400 space-y-1">
              <p>나의 순위 <span className="text-white font-bold">{userAmountRank}위</span> | <span className="text-white">₩{userAmount.toLocaleString()}</span></p>
              {userAmountRank > 1 && <p>1위까지 <span className="text-emerald-400 font-bold">₩{gapToFirst.toLocaleString()}</span> 차이</p>}
              {userAmountRank === 1 && <p className="text-emerald-400 font-bold">🎉 1위입니다!</p>}
            </div>
          )}
        </div>

        {/* 장려상 리더보드 */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">🎖 장려상 리더보드 (건수)</h2>
          <div className="space-y-2">
            {encourageRanking.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">장려상 후보가 없습니다</p>
            ) : (
              encourageRanking.map((rank, i) => {
                const isCurrentUser = rank.team === userTeam;
                return (
                  <div
                    key={rank.team}
                    className={`p-4 rounded-lg bg-blue-500/20 border-l-4 border-blue-400 transition-all ${isCurrentUser ? "ring-2 ring-emerald-400" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{getMedalIcon(i + 1)}</span>
                        <div>
                          <p className={`text-sm font-bold ${isCurrentUser ? "text-emerald-400" : "text-white"}`}>
                            {rank.team} {isCurrentUser ? "👈 나" : ""}
                          </p>
                          <p className="text-xs text-gray-500">₩{rank.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white">{rank.count}건</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 연속매출 스트릭 */}\n        <div>\n          <h2 className=\"text-sm font-semibold text-white mb-3\">🔥 연속매출 스트릭</h2>\n          <div className=\"p-6 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center space-y-2\">\n            <div className={`text-4xl font-bold ${streakBadge.color}`}>\n              {streakBadge.icon} {streakBadge.label}\n            </div>\n            <p className=\"text-xs text-gray-500\">현재 {streak}일 연속 매출</p>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n}\n\nfunction Loader() {\n  return (\n    <div className=\"min-h-screen bg-[#080a12] flex items-center justify-center\">\n      <div className=\"w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin\" />\n    </div>\n  );\n}\n