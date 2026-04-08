import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { LineChart, BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, Line, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#ec4899"];
const TABS = ["전체", "대리점별", "콜팀별", "지점별", "전환율 분석"];

function Card({ label, value, sub }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState(0);
  const [sales, setSales] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.SalesRecord.list("-sale_date", 5000),
      base44.entities.DealerInfo.list("-created_date", 500),
      base44.entities.CallTeamMember.list("-created_date", 500),
      base44.entities.CallLead.list("-created_date", 1000),
    ]).then(([s, d, c, l]) => { setSales(s); setDealers(d); setCallMembers(c); setLeads(l); setLoading(false); });
  }, []);

  // Monthly data
  const monthlyMap = {};
  sales.forEach(r => {
    const m = (r.sale_date || "").slice(0, 7);
    if (!m) return;
    monthlyMap[m] = (monthlyMap[m] || 0) + (r.sales_amount || 0);
  });
  const monthlyData = Object.entries(monthlyMap).sort().map(([month, total]) => ({ month, total }));

  // Summary cards
  const totalRevenue = sales.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRevenue = sales.filter(r => (r.sale_date || "").startsWith(thisMonth)).reduce((a, r) => a + (r.sales_amount || 0), 0);
  const activeDealers = dealers.filter(d => d.status === "active").length;
  const activeCall = callMembers.filter(m => m.status === "active").length;

  // Dealer bar chart
  const dealerMap = {};
  sales.forEach(r => {
    if (!r.dealer_name) return;
    dealerMap[r.dealer_name] = (dealerMap[r.dealer_name] || 0) + (r.sales_amount || 0);
  });
  const dealerData = Object.entries(dealerMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, total]) => ({ name: name.slice(0, 8), total }));

  // Call team bar chart
  const callMap = {};
  sales.forEach(r => {
    const team = r.from_call_team || r.call_team || "-";
    callMap[team] = (callMap[team] || 0) + (r.sales_amount || 0);
  });
  const callData = Object.entries(callMap).sort((a, b) => b[1] - a[1]).map(([name, total]) => ({ name, total }));

  // Region pie chart
  const regionMap = {};
  dealers.forEach(d => {
    const region = d.region || "미지정";
    regionMap[region] = (regionMap[region] || 0) + 1;
  });
  const regionData = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

  if (loading) return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080a12] px-4 py-6 max-w-5xl mx-auto">
      <h1 className="text-lg font-bold text-white mb-5">📊 분석 대시보드</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* 전체 */}
      {tab === 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="누적 매출" value={`₩${(totalRevenue / 10000).toFixed(0)}만`} />
            <Card label="이달 매출" value={`₩${(monthRevenue / 10000).toFixed(0)}만`} sub={thisMonth} />
            <Card label="활성 대리점" value={`${activeDealers}명`} />
            <Card label="활성 콜팀" value={`${activeCall}명`} />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-4">월별 매출 추이</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
                <Tooltip formatter={v => `₩${v.toLocaleString()}`} contentStyle={{ background: "#0d0f1a", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 대리점별 */}
      {tab === 1 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-4">대리점별 누적 매출 (TOP 15)</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dealerData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#d1d5db", fontSize: 10 }} width={70} />
              <Tooltip formatter={v => `₩${v.toLocaleString()}`} contentStyle={{ background: "#0d0f1a", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 콜팀별 */}
      {tab === 2 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-4">콜팀별 매출</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={callData}>
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
              <Tooltip formatter={v => `₩${v.toLocaleString()}`} contentStyle={{ background: "#0d0f1a", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 지점별 */}
      {tab === 3 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-4">지역별 대리점 분포</p>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={regionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 min-w-[120px]">
              {regionData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-300">{r.name}</span>
                  <span className="text-white font-medium ml-auto">{r.value}개</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 전환율 분석 */}
      {tab === 4 && (
        <div className="space-y-6">
          {/* Funnel */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <p className="text-xs text-gray-400 mb-4">콜 리드 전환 퍼널</p>
            <FunnelChart leads={leads} />
          </div>
          {/* Caller Ranking */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-4">콜러별 전환율 랭킹</p>
            <CallerRanking leads={leads} />
          </div>
          {/* Time Series */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-4">일일 신규 vs 전환</p>
            <TimeSeries leads={leads} />
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelChart({ leads }) {
  const statuses = { '신규': 0, '연락됨': 0, '가망': 0, '수락': 0, '전환완료': 0 };
  leads.forEach(l => {
    if (l.status === '신규') statuses['신규']++;
    else if (l.status === '연락됨') statuses['연락됨']++;
    else if (l.status === '관심있음') statuses['가망']++;
    else if (l.status === '거절') statuses['수락']++;
    else if (l.status === '매출전환') statuses['전환완료']++;
  });
  const stages = [
    { label: '신규', count: statuses['신규'], width: 100 },
    { label: '가망', count: statuses['가망'], width: 70 },
    { label: '수락', count: statuses['수락'], width: 50 },
    { label: '전환완료', count: statuses['전환완료'], width: 30 },
  ];
  return (
    <div className="space-y-4">
      {stages.map((s, i) => {
        const rate = i > 0 ? ((s.count / stages[i-1].count) * 100).toFixed(1) : 100;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-white">{s.label}</span>
              <span className="text-xs text-gray-400">{s.count}명 {i > 0 && `(${rate}%)`}</span>
            </div>
            <div className="w-full bg-white/10 rounded-lg h-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${Math.max(s.width, 5)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CallerRanking({ leads }) {
  const callerStats = {};
  leads.forEach(l => {
    const caller = l.created_by || '미지정';
    if (!callerStats[caller]) callerStats[caller] = { total: 0, interested: 0, converted: 0 };
    callerStats[caller].total++;
    if (l.status === '관심있음') callerStats[caller].interested++;
    if (l.status === '매출전환') callerStats[caller].converted++;
  });
  const ranking = Object.entries(callerStats)
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      interestedRate: ((stats.interested / stats.total) * 100).toFixed(1),
      convertedRate: ((stats.converted / stats.total) * 100).toFixed(1),
    }))
    .sort((a, b) => parseFloat(b.convertedRate) - parseFloat(a.convertedRate));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 text-gray-400">
            <th className="text-left py-2 px-3">콜러명</th>
            <th className="text-right py-2 px-3">총콜수</th>
            <th className="text-right py-2 px-3">가망전환율</th>
            <th className="text-right py-2 px-3">최종전환율</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => (
            <tr key={r.name} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2.5 px-3 text-white font-medium">{r.name}</td>
              <td className="py-2.5 px-3 text-right text-gray-300">{r.total}</td>
              <td className="py-2.5 px-3 text-right text-yellow-400">{r.interestedRate}%</td>
              <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{r.convertedRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimeSeries({ leads }) {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyMap = {};
  leads.forEach(l => {
    const d = l.created_at ? l.created_at.slice(0, 10) : null;
    if (!d) return;
    if (!dailyMap[d]) dailyMap[d] = { new: 0, converted: 0 };
    dailyMap[d].new++;
    if (l.status === '매출전환') dailyMap[d].converted++;
  });
  const data = Object.entries(dailyMap).sort().slice(-30).map(([date, stats]) => ({
    date: date.slice(5),
    new: stats.new,
    converted: stats.converted,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
        <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 12 }} />
        <Line type="monotone" dataKey="new" stroke="#3b82f6" name="신규" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="converted" stroke="#10b981" name="전환" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}