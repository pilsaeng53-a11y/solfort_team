import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import AdminHeader from "../components/AdminHeader";
import StatusBadge from "../components/StatusBadge";
import SFCard from "../components/SFCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const API = "https://solfort-js.onrender.com";
const TABS = ["대시보드", "고객 관리", "자동화", "리포트"];
const today = new Date().toISOString().split("T")[0];
const PERIOD_OPTIONS = [{ key: "today", label: "오늘" }, { key: "week", label: "이번주" }, { key: "month", label: "이번달" }, { key: "custom", label: "직접입력" }];
const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function CallTeam() {
  const [tab, setTab] = useState(0);
  useEffect(() => { document.title = "SolFort - 콜영업팀"; }, []);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="콜영업팀 운영센터" accent="emerald" />
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-white/[0.06]">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 0 && <Dashboard />}
        {tab === 1 && <CustomerManagement />}
        {tab === 2 && <Automation />}
        {tab === 3 && <Report />}
      </div>
    </div>
  );
}

/* ─── 1. 대시보드 ─── */
function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const load = async () => {
    const data = await base44.entities.SalesRecord.list("-created_date", 1000);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  const todayRecs = records.filter(r => r.sale_date === today);
  const totalRevenue = todayRecs.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const newCount = todayRecs.filter(r => r.customer_status === "new").length;

  const byDealer = Object.values(records.filter(r => r.sale_date === today).reduce((acc, r) => {
    acc[r.dealer_name] = acc[r.dealer_name] || { name: r.dealer_name, total: 0, count: 0 };
    acc[r.dealer_name].total += r.sales_amount || 0;
    acc[r.dealer_name].count += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "오늘 등록", value: `${todayRecs.length}건`, color: "text-emerald-400" },
          { label: "오늘 총 매출", value: `₩${totalRevenue.toLocaleString()}`, color: "text-yellow-400" },
          { label: "신규 고객", value: `${newCount}명`, color: "text-blue-400" },
        ].map(s => (
          <SFCard key={s.label}>
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </SFCard>
        ))}
      </div>

      <SFCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400">딜러별 오늘 매출</h3>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">30초 자동 갱신</span>
        </div>
        {byDealer.length === 0 ? (
          <p className="text-gray-600 text-xs py-4 text-center">오늘 매출 없음</p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["#","대리점","건수","매출"].map(h => <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {byDealer.map((d, i) => (
                <tr key={d.name} className="border-b border-white/[0.04]">
                  <td className="py-2 px-2 text-gray-600">{i + 1}</td>
                  <td className="py-2 px-2 text-white font-medium">{d.name}</td>
                  <td className="py-2 px-2 text-gray-400">{d.count}건</td>
                  <td className="py-2 px-2 text-white font-semibold">₩{d.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SFCard>

      <SFCard>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">최근 등록 피드</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {records.slice(0, 20).map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] text-xs">
              <StatusBadge status={r.customer_status} />
              <span className="text-white font-medium">{r.customer_name}</span>
              <span className="text-gray-500">{r.dealer_name}</span>
              <span className="text-gray-400 ml-auto">₩{(r.sales_amount || 0).toLocaleString()}</span>
              <span className="text-gray-600">{r.sale_date}</span>
            </div>
          ))}
        </div>
      </SFCard>
    </div>
  );
}

/* ─── 2. 고객 관리 ─── */
function CustomerManagement() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 2000).then(setRecords).finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.customer_name?.toLowerCase().includes(q) || r.phone?.includes(q) || r.dealer_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.customer_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="고객명 / 연락처 / 대리점 검색"
          className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder-gray-600" />
        {["all", "new", "existing", "duplicate"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {s === "all" ? "전체" : s === "new" ? "신규" : s === "existing" ? "기존" : "중복"}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <>
          <p className="text-xs text-gray-600">{filtered.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["날짜", "고객명", "연락처", "대리점", "매출", "SOF", "상태"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2 text-gray-500">{r.sale_date}</td>
                    <td className="py-2.5 px-2 text-white font-medium">{r.customer_name}</td>
                    <td className="py-2.5 px-2 text-gray-400">{r.phone}</td>
                    <td className="py-2.5 px-2 text-gray-400">{r.dealer_name}</td>
                    <td className="py-2.5 px-2 text-white">₩{(r.sales_amount || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-emerald-400">{(r.final_quantity || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-2"><StatusBadge status={r.customer_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── 3. 자동화 ─── */
function Automation() {
  const [dealers, setDealers] = useState([]);
  const [selected, setSelected] = useState("전체");
  const [date, setDate] = useState(today);
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [preview, setPreview] = useState("");
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
    } catch (e) { addLog(`❌ 실패: ${e.message}`); }
    setSending(false);
  };

  const generateReport = async () => {
    setReporting(true);
    setPreview("리포트 생성 중...");
    try {
      const res = await fetch(`${API}/telegram/report?date=${date}&preview=true`, { headers: Auth.headers() });
      const data = await res.json();
      setPreview(data.preview || data.message || "리포트 내용 없음");
      addLog("✅ 리포트 생성 완료");
    } catch (e) {
      setPreview("");
      addLog(`❌ 리포트 생성 실패: ${e.message}`);
    }
    setReporting(false);
  };

  const sendReport = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/telegram/report`, {
        method: "POST", headers: Auth.headers(),
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      addLog(`✅ 리포트 전송: ${data.message || "성공"}`);
    } catch (e) { addLog(`❌ 리포트 전송 실패: ${e.message}`); }
    setSending(false);
  };

  const downloadExcel = async () => {
    try {
      const records = await base44.entities.SalesRecord.list("-created_date", 2000);
      const header = "날짜,대리점명,고객명,전화,판매금액(KRW),USDT,SOF,상태";
      const rows = records.map(r =>
        [r.sale_date, r.dealer_name, r.customer_name, r.phone, r.sales_amount, r.usdt_amount, r.final_quantity, r.customer_status].join(",")
      );
      const blob = new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `SolFort_${date}.csv`; a.click();
      addLog("✅ 엑셀 다운로드 완료");
    } catch (e) { addLog(`❌ 다운로드 실패: ${e.message}`); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SFCard>
          <h3 className="text-sm font-semibold text-white mb-4">텔레그램 일괄 전송</h3>
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
            <button onClick={sendTelegram} disabled={sending}
              className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
              {sending ? "전송 중..." : "📤 텔레그램 전송"}
            </button>
          </div>
        </SFCard>

        <SFCard>
          <h3 className="text-sm font-semibold text-white mb-4">일일 리포트</h3>
          <div className="space-y-3">
            {preview && (
              <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                {preview}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={generateReport} disabled={reporting}
                className="bg-white/5 text-gray-300 py-2.5 rounded-xl text-xs font-medium hover:bg-white/10 transition-all disabled:opacity-50">
                {reporting ? "생성 중..." : "📋 미리보기"}
              </button>
              <button onClick={sendReport} disabled={sending}
                className="bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-xs font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50">
                📨 전송
              </button>
            </div>
            <button onClick={downloadExcel}
              className="w-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 py-2.5 rounded-xl text-sm font-medium hover:bg-yellow-500/20 transition-all">
              📥 엑셀 다운로드
            </button>
          </div>
        </SFCard>
      </div>

      {logs.length > 0 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">전송 이력 로그</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((l, i) => <p key={i} className="text-xs text-gray-400 font-mono">{l}</p>)}
          </div>
        </SFCard>
      )}
    </div>
  );
}

/* ─── 4. 리포트 ─── */
function Report() {
  const [period, setPeriod] = useState("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 2000).then(setRecords).finally(() => setLoading(false));
  }, []);

  const getRange = () => {
    if (period === "today") return [today, today];
    if (period === "week") {
      const d = new Date(); const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(new Date().setDate(diff)).toISOString().split("T")[0];
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

  const byDate = Object.values(filtered.reduce((acc, r) => {
    acc[r.sale_date] = acc[r.sale_date] || { date: r.sale_date, 매출: 0 };
    acc[r.sale_date].매출 += r.sales_amount || 0;
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date));

  const byDealer = Object.values(filtered.reduce((acc, r) => {
    acc[r.dealer_name] = acc[r.dealer_name] || { name: r.dealer_name, value: 0, count: 0 };
    acc[r.dealer_name].value += r.sales_amount || 0;
    acc[r.dealer_name].count += 1;
    return acc;
  }, {})).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${period === p.key ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            <span className="text-gray-500 text-xs">~</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          </div>
        )}
      </div>

      {loading ? <Loader /> : (
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
                  <Bar dataKey="매출" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SFCard>
          )}

          {byDealer.length > 0 && (
            <>
              <SFCard>
                <p className="text-xs text-gray-400 mb-3">대리점별 매출 비중</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byDealer.slice(0, 5)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {byDealer.slice(0, 5).map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} formatter={v => `₩${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </SFCard>

              <SFCard>
                <p className="text-xs text-gray-400 mb-3">대리점별 상세</p>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                    {["순위", "대리점", "건수", "매출", "비중"].map(h => <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {byDealer.map((d, i) => (
                      <tr key={d.name} className="border-b border-white/[0.04]">
                        <td className="py-2.5 px-2 text-gray-600">{i + 1}</td>
                        <td className="py-2.5 px-2 text-white font-medium">{d.name}</td>
                        <td className="py-2.5 px-2 text-gray-400">{d.count}건</td>
                        <td className="py-2.5 px-2 text-white">₩{d.value.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-emerald-400">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SFCard>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}