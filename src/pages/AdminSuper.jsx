import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import AdminHeader from "../components/AdminHeader";
import GradeBadge from "../components/GradeBadge";
import SFCard from "../components/SFCard";
import { ReportPanel } from "./AdminCall";
import PricingManager from "../components/PricingManager";

const API = "https://solfort-js.onrender.com";
const TABS = ["전체 현황", "딜러 관리", "콜팀 관리", "시스템 설정", "전체 리포트", "전체 회원 관리", "단가/요율 관리"];
const today = new Date().toISOString().split("T")[0];
const GRADES = ["GREEN", "PURPLE", "GOLD", "PLATINUM"];

export default function AdminSuper() {
  const [tab, setTab] = useState(0);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="최고 관리자" accent="purple" />
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-white/[0.06]">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 0 && <OverviewPanel />}
        {tab === 1 && <DealerManagement />}
        {tab === 2 && <CallManagement />}
        {tab === 3 && <SystemSettings />}
        {tab === 4 && <ReportPanel accent="purple" />}
        {tab === 5 && <AllMembersPanel />}
        {tab === 6 && <PricingManager />}
      </div>
    </div>
  );
}

function OverviewPanel() {
  const [overview, setOverview] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ovRes, d, s] = await Promise.all([
          fetch(`${API}/dashboard/admin/overview`, { headers: Auth.headers() }).then(r => r.json()),
          base44.entities.DealerInfo.list("-created_date", 100),
          base44.entities.SalesRecord.list("-created_date", 1000),
        ]);
        setOverview(ovRes);
        setDealers(d);
        setSales(s);
      } catch {
        setDealers(await base44.entities.DealerInfo.list("-created_date", 100).catch(() => []));
        setSales(await base44.entities.SalesRecord.list("-created_date", 1000).catch(() => []));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader />;

  const todaySales = sales.filter(s => s.sale_date === today);
  const totalRevenue = sales.reduce((a, s) => a + (s.sales_amount || 0), 0);

  const dealerRanking = Object.values(sales.reduce((acc, s) => {
    acc[s.dealer_name] = acc[s.dealer_name] || { name: s.dealer_name, total: 0 };
    acc[s.dealer_name].total += s.sales_amount || 0;
    return acc;
  }, {})).sort((a, b) => b.total - a.total).slice(0, 5);

  const stats = [
    { label: "전체 딜러", value: overview?.dealer_count ?? dealers.length, color: "text-purple-400" },
    { label: "전체 매출", value: `₩${(overview?.total_revenue ?? totalRevenue).toLocaleString()}`, color: "text-yellow-400" },
    { label: "오늘 등록", value: `${overview?.today_registrations ?? todaySales.length}건`, color: "text-emerald-400" },
    { label: "콜팀 건수", value: `${overview?.call_count ?? 0}건`, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <SFCard key={s.label}><p className="text-[10px] text-gray-500">{s.label}</p><p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p></SFCard>
        ))}
      </div>
      <SFCard>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">딜러 랭킹 TOP 5</h3>
        <div className="space-y-2">
          {dealerRanking.map((d, i) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-600 w-5">{i + 1}</span>
              <span className="flex-1 text-sm text-white">{d.name}</span>
              <span className="text-sm font-bold text-white">₩{d.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </SFCard>
    </div>
  );
}

function DealerManagement() {
  const [dealers, setDealers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [date, setDate] = useState(today);
  const [salesByDate, setSalesByDate] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, s] = await Promise.all([
        base44.entities.DealerInfo.list("-created_date", 200),
        base44.entities.SalesRecord.list("-created_date", 1000),
      ]);
      setDealers(d); setSales(s); setLoading(false);
    })();
  }, []);

  const changeGrade = async (dealer, grade) => {
    setUpdating(dealer.id);
    await fetch(`${API}/dealers/${dealer.id}`, { method: "PATCH", headers: Auth.headers(), body: JSON.stringify({ grade }) });
    setDealers(prev => prev.map(d => d.id === dealer.id ? { ...d, grade } : d));
    setUpdating(null);
  };

  const loadSalesByDate = async () => {
    setLoadingSales(true);
    const res = await fetch(`${API}/sales/list?date=${date}`, { headers: Auth.headers() });
    const data = await res.json();
    setSalesByDate(Array.isArray(data) ? data : (data.sales || []));
    setLoadingSales(false);
  };

  const todaySales = (name) => sales.filter(s => s.dealer_name === name && s.sale_date === today).reduce((a, s) => a + (s.sales_amount || 0), 0);
  const totalSales = (name) => sales.filter(s => s.dealer_name === name).reduce((a, s) => a + (s.sales_amount || 0), 0);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">딜러 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점명","대리점주","등급","오늘매출","누적매출","등급변경"].map(h => <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {dealers.map(d => (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                  <td className="py-3 px-2 text-gray-400">{d.owner_name}</td>
                  <td className="py-3 px-2"><GradeBadge grade={d.grade} /></td>
                  <td className="py-3 px-2 text-white">₩{todaySales(d.dealer_name).toLocaleString()}</td>
                  <td className="py-3 px-2 text-white">₩{totalSales(d.dealer_name).toLocaleString()}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1 flex-wrap">
                      {GRADES.map(g => (
                        <button key={g} onClick={() => changeGrade(d, g)} disabled={updating === d.id || d.grade === g}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${d.grade === g ? "bg-purple-500/30 text-purple-300" : "bg-white/5 text-gray-500 hover:bg-white/10"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">매출 현황</h3>
        <div className="flex gap-2 mb-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          <button onClick={loadSalesByDate} className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-lg text-xs">조회</button>
        </div>
        {loadingSales ? <Loader /> : salesByDate.length > 0 && (
          <div className="space-y-2">
            {Object.values(salesByDate.reduce((acc, s) => {
              acc[s.dealer_name] = acc[s.dealer_name] || { name: s.dealer_name, total: 0, count: 0 };
              acc[s.dealer_name].total += s.sales_amount || 0;
              acc[s.dealer_name].count += 1;
              return acc;
            }, {})).sort((a, b) => b.total - a.total).map((d, i) => (
              <SFCard key={d.name}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-600 w-5">{i+1}</span>
                  <div className="flex-1"><p className="text-sm text-white">{d.name}</p><p className="text-xs text-gray-500">{d.count}건</p></div>
                  <p className="text-sm font-bold text-white">₩{d.total.toLocaleString()}</p>
                </div>
              </SFCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CallManagement() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 1000).then(setRecords).finally(() => setLoading(false));
  }, []);

  const todayRecs = records.filter(r => r.sale_date === today);
  const total = todayRecs.reduce((a, r) => a + (r.sales_amount || 0), 0);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/telegram/send`, { method: "POST", headers: Auth.headers(), body: JSON.stringify({ dealer: "전체", date }) });
      const data = await res.json();
      setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ✅ ${data.message || "전송 완료"}`, ...prev]);
    } catch (e) { setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ❌ 실패: ${e.message}`, ...prev]); }
    setSending(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "오늘 등록", value: `${todayRecs.length}건` },
          { label: "오늘 매출", value: `₩${total.toLocaleString()}` },
          { label: "신규", value: `${todayRecs.filter(r => r.customer_status === "new").length}건` },
        ].map(s => (
          <SFCard key={s.label}><p className="text-[10px] text-gray-500">{s.label}</p><p className="text-lg font-bold text-white mt-1">{s.value}</p></SFCard>
        ))}
      </div>
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">일괄 텔레그램 전송</h3>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          <button onClick={send} disabled={sending}
            className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-lg text-xs hover:bg-purple-500/30 transition-all disabled:opacity-50">
            {sending ? "전송 중..." : "📤 전송"}
          </button>
        </div>
        {logs.length > 0 && (
          <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
            {logs.map((l, i) => <p key={i} className="text-xs text-gray-400 font-mono">{l}</p>)}
          </div>
        )}
      </SFCard>
    </div>
  );
}

function SystemSettings() {
  const [settings, setSettings] = useState({ sof_price: 0.01, promo_pct: 300, usdt_rate: 1450 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/settings`, { method: "PUT", headers: Auth.headers(), body: JSON.stringify(settings) });
    } catch {}
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-md space-y-4">
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">시스템 설정</h3>
        <div className="space-y-4">
          {[
            { key: "sof_price", label: "SOF 기본 단가 (USDT)", step: 0.001 },
            { key: "promo_pct", label: "프로모션 배율 (%)", step: 10 },
            { key: "usdt_rate", label: "기본 환율 (KRW/USDT)", step: 10 },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400">{f.label}</label>
              <input type="number" value={settings[f.key]} step={f.step}
                onChange={e => setSettings(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <button onClick={save} disabled={saving}
            className="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 py-3 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50">
            {saved ? "✅ 저장 완료" : saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </SFCard>
    </div>
  );
}

function AllMembersPanel() {
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = async () => {
    setLoading(true);
    const [d, c] = await Promise.all([
      base44.entities.DealerInfo.list("-created_date", 200),
      base44.entities.CallTeamMember.list("-created_date", 200),
    ]);
    setDealers(d); setCallMembers(c); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approveCall = async (id, status) => {
    setUpdating(id);
    await base44.entities.CallTeamMember.update(id, { status });
    setCallMembers(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    setUpdating(null);
  };

  const pendingCall = callMembers.filter(m => m.status === "pending");

  const dCount = (s) => dealers.filter(d => d.status === s).length;
  const cCount = (s) => callMembers.filter(m => m.status === s).length;

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {/* Section A: 콜팀 승인 대기 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">콜팀 승인 대기</h3>
          {pendingCall.length > 0 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pendingCall.length}건</span>}
        </div>
        {pendingCall.length === 0 ? (
          <p className="text-xs text-gray-600 py-6 text-center">승인 대기 중인 콜팀원이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["가입일","이름","아이디","연락처","소속팀","사원번호","처리"].map(h => <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {pendingCall.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.04]">
                    <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                    <td className="py-3 px-2 text-gray-500">{m.username}</td>
                    <td className="py-3 px-2 text-gray-400">{m.phone}</td>
                    <td className="py-3 px-2 text-gray-400">{m.team}</td>
                    <td className="py-3 px-2 text-gray-500">{m.employee_id || "-"}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => approveCall(m.id, "active")} disabled={updating === m.id}
                          className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                          ✅ 승인
                        </button>
                        <button onClick={() => approveCall(m.id, "suspended")} disabled={updating === m.id}
                          className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] hover:bg-red-500/30 transition-all disabled:opacity-50">
                          ❌ 거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section B: 전체 계정 현황 */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">전체 계정 현황</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SFCard>
            <p className="text-xs text-gray-400 mb-2">🏪 대리점 계정</p>
            <div className="flex gap-3 text-[11px]">
              <span className="text-emerald-400">활성 {dCount("active")}</span>
              <span className="text-yellow-400">대기 {dCount("pending")}</span>
              <span className="text-red-400">정지 {dCount("suspended")}</span>
            </div>
          </SFCard>
          <SFCard>
            <p className="text-xs text-gray-400 mb-2">📞 콜팀 계정</p>
            <div className="flex gap-3 text-[11px]">
              <span className="text-emerald-400">활성 {cCount("active")}</span>
              <span className="text-yellow-400">대기 {cCount("pending")}</span>
              <span className="text-red-400">정지 {cCount("suspended")}</span>
            </div>
          </SFCard>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["유형","이름","아이디","연락처","가입일","상태"].map(h => <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {[...dealers.map(d => ({ type: "대리점", name: d.dealer_name, username: d.username, phone: d.phone, date: d.created_date, status: d.status, id: d.id })),
                ...callMembers.map(m => ({ type: "콜팀", name: m.name, username: m.username, phone: m.phone, date: m.created_date, status: m.status, id: m.id }))]
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                .map(row => (
                  <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.type === "대리점" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>{row.type}</span>
                    </td>
                    <td className="py-2.5 px-2 text-white font-medium">{row.name}</td>
                    <td className="py-2.5 px-2 text-gray-500">{row.username || "-"}</td>
                    <td className="py-2.5 px-2 text-gray-400">{row.phone}</td>
                    <td className="py-2.5 px-2 text-gray-500">{row.date?.split("T")[0]}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                        row.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>{row.status === "active" ? "활성" : row.status === "pending" ? "대기" : "정지"}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}