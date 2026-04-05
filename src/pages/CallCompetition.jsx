import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const today = new Date().toISOString().split("T")[0];
const currentMonth = today.slice(0, 7);
const monthStart = `${currentMonth}-01`;
const currentYear = today.slice(0, 4);

function getWeekRange() {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split("T")[0],
    end: sun.toISOString().split("T")[0],
  };
}

export default function CallCompetition() {
  const [tab, setTab] = useState(0);
  const [salesData, setSalesData] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [monthlyResults, setMonthlyResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const load = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const records = await base44.entities.SalesRecord.list("-created_date", 5000);
      const members = await base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 500);
      const results = await base44.entities.MonthlyCompetitionResult?.list?.("-created_date", 500) || [];

      setSalesData(records);
      setCallMembers(members);
      setMonthlyResults(results);
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

  const TABS = ["개인전", "팀전", "이번주", "연간MVP"];

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="sticky top-0 z-10 bg-[#080a12] border-b border-white/[0.06] px-4 py-4">
        <h1 className="text-xl font-bold text-white mb-3">🏆 콜팀 경쟁</h1>
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === i
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">
        {tab === 0 && <PersonalRankTab salesData={salesData} currentUser={currentUser} />}
        {tab === 1 && <TeamRankTab salesData={salesData} callMembers={callMembers} currentUser={currentUser} />}
        {tab === 2 && <WeeklyRankTab salesData={salesData} currentUser={currentUser} />}
        {tab === 3 && <AnnualMVPTab monthlyResults={monthlyResults} />}
      </div>

      <NewcomerAwardSection salesData={salesData} callMembers={callMembers} />
    </div>
  );
}

function PersonalRankTab({ salesData, currentUser }) {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);
  const monthStart = `${currentMonth}-01`;

  const grouped = Object.values(
    salesData
      .filter((r) => r.sale_date >= monthStart && r.sale_date <= today && r.from_call_team)
      .reduce((acc, r) => {
        const team = r.from_call_team;
        acc[team] = acc[team] || { team, totalAmount: 0, count: 0 };
        acc[team].totalAmount += r.sales_amount || 0;
        acc[team].count += 1;
        return acc;
      }, {})
  ).sort((a, b) => b.totalAmount - a.totalAmount);

  const userTeam = currentUser?.username;
  const userAmountRank = grouped.findIndex((a) => a.team === userTeam) + 1;
  const userAmountData = grouped.find((a) => a.team === userTeam);
  const userAmount = userAmountData?.totalAmount || 0;
  const firstAmount = grouped[0]?.totalAmount || 0;
  const gapToFirst = firstAmount - userAmount;

  const getMedalIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        {grouped.map((rank, i) => {
          const isCurrentUser = rank.team === userTeam;
          const bgClass =
            i === 0
              ? "bg-yellow-500/20 border-l-4 border-yellow-400"
              : i === 1
              ? "bg-gray-400/10 border-l-4 border-gray-300"
              : i === 2
              ? "bg-orange-700/20 border-l-4 border-orange-600"
              : "bg-white/5 border-l-4 border-transparent";
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

      {userAmountData && (
        <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] text-xs text-gray-400 space-y-1">
          <p>
            나의 순위 <span className="text-white font-bold">{userAmountRank}위</span> | <span className="text-white">₩{userAmount.toLocaleString()}</span>
          </p>
          {userAmountRank > 1 && <p>1위까지 <span className="text-emerald-400 font-bold">₩{gapToFirst.toLocaleString()}</span> 차이</p>}
          {userAmountRank === 1 && <p className="text-emerald-400 font-bold">🎉 1위입니다!</p>}
        </div>
      )}
    </div>
  );
}

function TeamRankTab({ salesData, callMembers, currentUser }) {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);
  const monthStart = `${currentMonth}-01`;

  const teamMap = Object.fromEntries(callMembers.map((m) => [m.username, m.team]));

  const grouped = Object.values(
    salesData
      .filter((r) => r.sale_date >= monthStart && r.sale_date <= today && r.from_call_team)
      .reduce((acc, r) => {
        const teamName = teamMap[r.from_call_team] || r.from_call_team;
        acc[teamName] = acc[teamName] || { team: teamName, totalAmount: 0, count: 0 };
        acc[teamName].totalAmount += r.sales_amount || 0;
        acc[teamName].count += 1;
        return acc;
      }, {})
  ).sort((a, b) => b.totalAmount - a.totalAmount);

  const userTeamName = teamMap[currentUser?.username] || currentUser?.username;
  const userTeamRank = grouped.findIndex((a) => a.team === userTeamName) + 1;
  const userTeamData = grouped.find((a) => a.team === userTeamName);

  const getMedalIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        {grouped.map((rank, i) => {
          const isCurrentTeam = rank.team === userTeamName;
          const bgClass =
            i === 0
              ? "bg-yellow-500/20 border-l-4 border-yellow-400"
              : i === 1
              ? "bg-gray-400/10 border-l-4 border-gray-300"
              : i === 2
              ? "bg-orange-700/20 border-l-4 border-orange-600"
              : "bg-white/5 border-l-4 border-transparent";
          return (
            <div
              key={rank.team}
              className={`p-4 rounded-lg border transition-all ${bgClass} ${isCurrentTeam ? "ring-2 ring-emerald-400" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white w-8">{getMedalIcon(i + 1)}</span>
                  <div>
                    <p className={`text-sm font-bold ${isCurrentTeam ? "text-emerald-400" : "text-white"}`}>
                      {rank.team} {isCurrentTeam ? "👈 우리팀" : ""}
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

      {userTeamData && (
        <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06] text-xs text-gray-400">
          우리팀 {userTeamRank}위 ₩{userTeamData.totalAmount.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function WeeklyRankTab({ salesData, currentUser }) {
  const { start, end } = getWeekRange();
  const weekData = salesData.filter((r) => r.sale_date >= start && r.sale_date <= end && r.from_call_team);

  const grouped = Object.values(
    weekData.reduce((acc, r) => {
      const team = r.from_call_team;
      acc[team] = acc[team] || { team, totalAmount: 0, count: 0 };
      acc[team].totalAmount += r.sales_amount || 0;
      acc[team].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <div className="space-y-4 py-4">
      <p className="text-xs text-gray-500">
        {start} ~ {end}
      </p>
      <div className="space-y-2">
        {grouped.slice(0, 5).map((rank, i) => (
          <div
            key={rank.team}
            className="p-4 rounded-lg bg-indigo-500/20 border-l-4 border-indigo-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-indigo-400">{i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-white">{rank.team}</p>
                  <p className="text-xs text-gray-500">{rank.count}건</p>
                </div>
              </div>
              <p className="text-lg font-bold text-white">₩{rank.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnualMVPTab({ monthlyResults }) {
  const thisYear = new Date().getFullYear().toString();
  const goldWins = monthlyResults
    .filter((r) => r.award_type === "gold" && r.created_at?.startsWith(thisYear))
    .reduce((acc, r) => {
      acc[r.person_name] = (acc[r.person_name] || 0) + 1;
      return acc;
    }, {});

  const ranked = Object.entries(goldWins)
    .map(([name, wins]) => ({ name, wins }))
    .sort((a, b) => b.wins - a.wins);

  return (
    <div className="space-y-4 py-4">
      <h2 className="text-sm font-semibold text-white mb-3">👑 연간 MVP 레이스</h2>
      {ranked.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-8">아직 데이터가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {ranked.map((person, i) => (
            <div
              key={person.name}
              className="p-4 rounded-lg bg-purple-500/20 border-l-4 border-purple-400"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{"👑💎⭐"[i] || "🏅"}</span>
                  <p className="text-sm font-bold text-white">{person.name}</p>
                </div>
                <p className="text-lg font-bold text-purple-400">{person.wins}회</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewcomerAwardSection({ salesData, callMembers }) {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);
  const monthStart = `${currentMonth}-01`;

  const thisMonthMembers = callMembers.filter((m) => (m.created_date || "").startsWith(currentMonth));
  const newcomerSales = thisMonthMembers
    .map((member) => {
      const sales = salesData
        .filter((r) => r.sale_date >= monthStart && r.sale_date <= today && r.from_call_team === member.username)
        .reduce((sum, r) => sum + (r.sales_amount || 0), 0);
      return { name: member.name, sales };
    })
    .filter((x) => x.sales > 0)
    .sort((a, b) => b.sales - a.sales)[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 border-t border-white/[0.06] mt-6">
      {newcomerSales ? (
        <div className="p-6 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-500/30 text-center space-y-2">
          <p className="text-3xl">🌟</p>
          <p className="text-sm font-semibold text-white">이달의 신인왕</p>
          <p className="text-xl font-bold text-yellow-400">{newcomerSales.name}</p>
          <p className="text-xs text-gray-400">₩{newcomerSales.sales.toLocaleString()} 판매</p>
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-4">이달의 신인왕 후보가 없습니다</p>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}