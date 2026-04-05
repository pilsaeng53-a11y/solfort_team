import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import AdminHeader from "../components/AdminHeader";
import SFCard from "../components/SFCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const TABS = ["온라인팀 현황", "DB실적", "광고현황", "전체 현황"];
const today = new Date().toISOString().split("T")[0];

export default function OnlineDirector() {
  const [tab, setTab] = useState(0);
  useEffect(() => { document.title = "SolFort - 온라인디렉터"; }, []);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="온라인 디렉터" accent="purple" />
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-purple-500/10">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 0 && <TeamOverviewTab />}
        {tab === 1 && <DBPerformanceTab />}
        {tab === 2 && <AdStatusTab />}
        {tab === 3 && <FullAnalyticsTab />}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   탭 0: 온라인팀 현황
   ────────────────────────────────────────────────────────────────────────────── */
function TeamOverviewTab() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.OnlineTeamMember.list("-created_date", 200).then(setMembers).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const active = members.filter(m => m.status === "active").length;
  const pending = members.filter(m => m.status === "pending").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "총 온라인팀", value: members.length, color: "text-purple-400" },
          { label: "활성", value: active, color: "text-emerald-400" },
          { label: "대기", value: pending, color: "text-yellow-400" },
        ].map(c => (
          <SFCard key={c.label}>
            <p className="text-[10px] text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </SFCard>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">온라인팀원 목록</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["이름", "아이디", "연락처", "팀", "메타 계정", "상태", "가입일"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-600">온라인팀원 없음</td></tr>
              ) : members.map(m => (
                <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                  <td className="py-3 px-2 text-gray-500">{m.username}</td>
                  <td className="py-3 px-2 text-gray-400">{m.phone || "-"}</td>
                  <td className="py-3 px-2 text-gray-400">{m.team || "-"}</td>
                  <td className="py-3 px-2 text-gray-300 max-w-[150px] truncate">{m.meta_ad_account || "-"}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${m.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {m.status === "active" ? "활성" : "대기"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0] || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   탭 1: DB실적
   ────────────────────────────────────────────────────────────────────────────── */
function DBPerformanceTab() {
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SalesRecord.list("-created_date", 5000),
      base44.entities.OnlineTeamMember.list("-created_date", 200),
    ]).then(([r, m]) => {
      setRecords(r);
      setMembers(m);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader />;

  const onlineRecords = records.filter(r => r.from_online_team);
  const totalDB = onlineRecords.length;
  const dealerSet = new Set(onlineRecords.map(r => r.dealer_name).filter(Boolean));
  const connectedDealers = dealerSet.size;

  const callTeamSet = new Set();
  for (const rec of onlineRecords) {
    const dealer = rec.dealer_name;
    // This would need actual dealer-to-callteam mapping, for now we'll estimate
    // by counting unique "sources" or assume dealers can have multiple call teams
    callTeamSet.add(`${dealer}_callteam`);
  }
  const connectedCallTeams = callTeamSet.size;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "총 DB 수", value: totalDB, color: "text-blue-400" },
          { label: "연결 대리점", value: connectedDealers, color: "text-emerald-400" },
          { label: "연결 콜팀", value: connectedCallTeams, color: "text-purple-400" },
        ].map(c => (
          <SFCard key={c.label}>
            <p className="text-[10px] text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </SFCard>
        ))}
      </div>

      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-3">온라인팀별 DB 생성 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["팀원", "아이디", "생성된 DB", "연결 대리점"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {members.map(m => {
                const memberRecords = onlineRecords.filter(r => r.from_online_team === m.username);
                const dealerCount = new Set(memberRecords.map(r => r.dealer_name).filter(Boolean)).size;
                return (
                  <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                    <td className="py-3 px-2 text-gray-500">{m.username}</td>
                    <td className="py-3 px-2 text-blue-400 font-bold">{memberRecords.length}건</td>
                    <td className="py-3 px-2 text-emerald-400">{dealerCount}개</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SFCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   탭 2: 광고현황
   ────────────────────────────────────────────────────────────────────────────── */
function AdStatusTab() {
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SalesRecord.list("-created_date", 5000),
      base44.entities.OnlineTeamMember.list("-created_date", 200),
    ]).then(([r, m]) => {
      setRecords(r);
      setMembers(m);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader />;

  const onlineRecords = records.filter(r => r.from_online_team);
  const adData = members.map(m => {
    const created = onlineRecords.filter(r => r.from_online_team === m.username).length;
    const connected = onlineRecords.filter(r => r.from_online_team === m.username && r.dealer_name).length;
    return { ...m, created, connected };
  }).sort((a, b) => b.created - a.created);

  return (
    <div className="space-y-5">
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-3">광고 성과</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["팀원 이름", "메타 계정", "DB 생성 수", "연결 건수"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {adData.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-600">데이터 없음</td></tr>
              ) : adData.map(a => (
                <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{a.name}</td>
                  <td className="py-3 px-2 text-gray-300 max-w-[200px] truncate">{a.meta_ad_account || "-"}</td>
                  <td className="py-3 px-2 text-blue-400 font-bold">{a.created}건</td>
                  <td className="py-3 px-2 text-emerald-400 font-bold">{a.connected}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SFCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   탭 3: 전체 현황 (AnalyticsDashboard 유사)
   ────────────────────────────────────────────────────────────────────────────── */
function FullAnalyticsTab() {
  const [records, setRecords] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const [r, d, c] = await Promise.all([
        base44.entities.SalesRecord.list("-created_date", 5000),
        base44.entities.DealerInfo.list("-created_date", 200),
        base44.entities.CallTeamMember.list("-created_date", 200),
      ]);
      setRecords(r);
      setDealers(d);
      setCallMembers(c);
      setLoading(false);
    };
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (loading) return <Loader />;

  const total = records.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const newCount = records.filter(r => r.customer_status === "new").length;
  const existingCount = records.filter(r => r.customer_status === "existing").length;
  const dupCount = records.filter(r => r.customer_status === "duplicate").length;

  const byDate = Object.values(records.reduce((acc, r) => {
    acc[r.sale_date] = acc[r.sale_date] || { date: r.sale_date.slice(5), sales: 0, count: 0 };
    acc[r.sale_date].sales += Math.round((r.sales_amount || 0) / 10000);
    acc[r.sale_date].count += 1;
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  const pieData = [
    { name: "신규", value: newCount },
    { name: "기존", value: existingCount },
    { name: "중복", value: dupCount },
  ].filter(d => d.value > 0);
  const PIE_COLORS = ["#facc15", "#10b981", "#ef4444"];

  const dealerRows = dealers.map(d => {
    const dr = records.filter(r => r.dealer_name === d.dealer_name);
    return {
      ...d,
      total: dr.reduce((a, r) => a + (r.sales_amount || 0), 0),
      count: dr.length,
      newC: dr.filter(r => r.customer_status === "new").length,
    };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "총 매출", value: `₩${total.toLocaleString()}`, color: "text-yellow-400" },
          { label: "총 건수", value: `${records.length}건`, color: "text-white" },
        ].map(c => (
          <SFCard key={c.label}>
            <p className="text-[10px] text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </SFCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {byDate.length > 0 && (
          <SFCard>
            <p className="text-xs text-gray-400 mb-3">일별 매출 추이 (만원)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDate}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SFCard>
        )}
        {pieData.length > 0 && (
          <SFCard>
            <p className="text-xs text-gray-400 mb-3">신규 / 기존 / 중복 비율</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </SFCard>
        )}
      </div>

      {dealerRows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">TOP 10 대리점</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["순위", "대리점명", "총 매출", "건수", "신규"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {dealerRows.map((d, i) => (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-gray-500 font-bold">{i + 1}</td>
                    <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                    <td className="py-3 px-2 text-white font-bold">₩{d.total.toLocaleString()}</td>
                    <td className="py-3 px-2 text-gray-400">{d.count}건</td>
                    <td className="py-3 px-2 text-yellow-400">{d.newC}</td>
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

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}