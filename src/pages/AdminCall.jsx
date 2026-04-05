import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import AdminHeader from "../components/AdminHeader";
import StatusBadge from "../components/StatusBadge";
import SFCard from "../components/SFCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const API = "https://solfort-js.onrender.com";
const TABS = ["콜팀 현황", "전체 고객 관리", "자동화 관리", "리포트"];
const today = new Date().toISOString().split("T")[0];
const PERIOD_OPTIONS = [{ key: "today", label: "오늘" }, { key: "week", label: "이번주" }, { key: "month", label: "이번달" }, { key: "custom", label: "직접입력" }];
const PIE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function AdminCall() {
  const [tab, setTab] = useState(0);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="콜팀 관리자" accent="emerald" />
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-white/[0.06]">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 0 && <CallStatus />}
        {tab === 1 && <AllCustomers />}
        {tab === 2 && <AutomationPanel />}
        {tab === 3 && <ReportPanel accent="emerald" />}
      </div>
    </div>
  );
}

function CallStatus() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 1000).then(setRecords).finally(() => setLoading(false));
  }, []);

  const todayRecs = records.filter(r => r.sale_date === today);
  const total = todayRecs.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const newCount = todayRecs.filter(r => r.customer_status === "new").length;
  const conversionRate = todayRecs.length > 0 ? Math.round((newCount / todayRecs.length) * 100) : 0;

  if (loading) return <Loader accent="emerald" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "오늘 등록", value: `${todayRecs.length}건`, color: "text-emerald-400" },
          { label: "전환율", value: `${conversionRate}%`, color: "text-blue-400" },
          { label: "오늘 총 매출", value: `₩${total.toLocaleString()}`, color: "text-yellow-400" },
        ].map(s => (
          <SFCard key={s.label}>
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </SFCard>
        ))}
      </div>
      <SFCard>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">실시간 피드</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {todayRecs.slice(0, 20).map(r => (
            <div key={r.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/[0.04]">
              <StatusBadge status={r.customer_status} />
              <span className="text-white">{r.customer_name}</span>
              <span className="text-gray-500">{r.dealer_name}</span>
              <span className="text-gray-400 ml-auto">₩{(r.sales_amount||0).toLocaleString()}</span>
            </div>
          ))}
          {todayRecs.length === 0 && <p className="text-gray-600 text-xs py-4 text-center">오늘 등록 내역 없음</p>}
        </div>
      </SFCard>
    </div>
  );
}

function AllCustomers() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 1000).then(setRecords).finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r => {
    const inRange = (!from || r.sale_date >= from) && (!to || r.sale_date <= to);
    const matchStatus = statusFilter === "all" || r.customer_status === statusFilter;
    return inRange && matchStatus;
  });

  const stats = {
    new: filtered.filter(r => r.customer_status === "new").length,
    existing: filtered.filter(r => r.customer_status === "existing").length,
    duplicate: filtered.filter(r => r.customer_status === "duplicate").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
        <span className="text-gray-500 text-xs">~</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
        {["all","new","existing","duplicate"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {s === "all" ? "전체" : s === "new" ? "신규" : s === "existing" ? "기존" : "중복"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[["신규", stats.new, "text-yellow-400"], ["기존", stats.existing, "text-emerald-400"], ["중복", stats.duplicate, "text-red-400"]].map(([l, v, c]) => (
          <SFCard key={l}><p className="text-[10px] text-gray-500">{l}</p><p className={`text-xl font-bold ${c}`}>{v}건</p></SFCard>
        ))}
      </div>
      {loading ? <Loader accent="emerald" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점","고객명","전화","금액","상태","날짜"].map(h => <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 text-gray-400">{r.dealer_name}</td>
                  <td className="py-2.5 px-2 text-white">{r.customer_name}</td>
                  <td className="py-2.5 px-2 text-gray-400">{r.phone}</td>
                  <td className="py-2.5 px-2 text-white">₩{(r.sales_amount||0).toLocaleString()}</td>
                  <td className="py-2.5 px-2"><StatusBadge status={r.customer_status} /></td>
                  <td className="py-2.5 px-2 text-gray-500">{r.sale_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-600 mt-2">{filtered.length}건</p>
        </div>
      )}
    </div>
  );
}

function AutomationPanel() {
  const [dealers, setDealers] = useState([]);
  const [selected, setSelected] = useState("전체");
  const [date, setDate] = useState(today);
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    base44.entities.DealerInfo.list("-created_date", 100).then(setDealers);
  }, []);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ${msg}`, ...prev]);

  const sendTelegram = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/telegram/send`, {
        method: "POST", headers: Auth.headers(),
        body: JSON.stringify({ dealer: selected, date }),
      });
      const data = await res.json();
      addLog(`✅ 전송 완료: ${data.message || "성공"}`);
    } catch (e) { addLog(`❌ 전송 실패: ${e.message}`); }
    setSending(false);
  };

  const sendReport = async () => {
    setReporting(true);
    try {
      const res = await fetch(`${API}/telegram/report`, {
        method: "POST", headers: Auth.headers(),
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      addLog(`✅ 리포트 전송: ${data.message || "성공"}`);
    } catch (e) { addLog(`❌ 리포트 실패: ${e.message}`); }
    setReporting(false);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">일괄 텔레그램 전송</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400">대리점 선택</label>
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
              <option value="전체">전체</option>
              {dealers.map(d => <option key={d.id} value={d.dealer_name}>{d.dealer_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">날짜</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={sendTelegram} disabled={sending}
              className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl text-xs font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
              {sending ? "전송 중..." : "📤 전송"}
            </button>
            <button onClick={sendReport} disabled={reporting}
              className="bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-xs font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50">
              {reporting ? "생성 중..." : "📊 일일 리포트"}
            </button>
          </div>
        </div>
      </SFCard>
      {logs.length > 0 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">전송 이력</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {logs.map((l, i) => <p key={i} className="text-xs text-gray-400 font-mono">{l}</p>)}
          </div>
        </SFCard>
      )}
    </div>
  );
}

export function ReportPanel({ accent = "emerald" }) {
  const [period, setPeriod] = useState("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 1000).then(setRecords).finally(() => setLoading(false));
  }, []);

  const getRange = () => {
    const d = new Date();
    if (period === "today") return [today, today];
    if (period === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diff)).toISOString().split("T")[0];
      return [mon, today];
    }
    if (period === "month") return [today.slice(0, 7) + "-01", today];
    return [from, to];
  };

  const [start, end] = getRange();
  const filtered = records.filter(r => r.sale_date >= start && r.sale_date <= end);
  const total = filtered.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const newCount = filtered.filter(r => r.customer_status === "new").length;
  const existingCount = filtered.filter(r => r.customer_status === "existing").length;

  // Bar chart data by date
  const byDate = Object.values(filtered.reduce((acc, r) => {
    acc[r.sale_date] = acc[r.sale_date] || { date: r.sale_date, 매출: 0 };
    acc[r.sale_date].매출 += r.sales_amount || 0;
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date));

  // Pie chart data by dealer
  const byDealer = Object.values(filtered.reduce((acc, r) => {
    acc[r.dealer_name] = acc[r.dealer_name] || { name: r.dealer_name, value: 0 };
    acc[r.dealer_name].value += r.sales_amount || 0;
    return acc;
  }, {})).sort((a, b) => b.value - a.value).slice(0, 5);

  const accentBg = accent === "emerald" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30";
  const barColor = accent === "emerald" ? "#10b981" : "#8b5cf6";

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${period === p.key ? `${accentBg} border` : "bg-white/5 text-gray-400"}`}>
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            <span className="text-gray-500 text-xs self-center">~</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          </>
        )}
      </div>
      {loading ? <Loader accent={accent} /> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "총 매출", value: `₩${total.toLocaleString()}` },
              { label: "총 건수", value: `${filtered.length}건` },
              { label: "신규/기존", value: `${newCount} / ${existingCount}` },
            ].map(s => (
              <SFCard key={s.label}><p className="text-[10px] text-gray-500">{s.label}</p><p className="text-base font-bold text-white mt-1">{s.value}</p></SFCard>
            ))}
          </div>
          {byDate.length > 0 && (
            <SFCard>
              <p className="text-xs text-gray-400 mb-3">일별 매출 추이</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byDate}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="매출" fill={barColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SFCard>
          )}
          {byDealer.length > 0 && (
            <SFCard>
              <p className="text-xs text-gray-400 mb-3">대리점별 매출 비중</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byDealer} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {byDealer.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} formatter={v => `₩${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </SFCard>
          )}
        </>
      )}
    </div>
  );
}

function Loader({ accent = "emerald" }) {
  const color = accent === "emerald" ? "border-t-emerald-500 border-emerald-500/30" : "border-t-purple-500 border-purple-500/30";
  return <div className="flex justify-center py-12"><div className={`w-6 h-6 border-2 ${color} rounded-full animate-spin`} /></div>;
}