import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import AdminHeader from "../components/AdminHeader";
import GradeBadge from "../components/GradeBadge";
import StatusBadge from "../components/StatusBadge";
import SFCard from "../components/SFCard";

const API = "https://solfort-js.onrender.com";
const TABS = ["전체 현황", "딜러 계정 관리", "매출 데이터", "알림/전송"];
const GRADES = ["GREEN", "PURPLE", "GOLD", "PLATINUM"];
const today = new Date().toISOString().split("T")[0];

export default function AdminDealer() {
  const [tab, setTab] = useState(0);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="딜러 관리자" accent="blue" />
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-white/[0.06]">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 0 && <OverviewPanel />}
        {tab === 1 && <DealerAccountPanel />}
        {tab === 2 && <SalesDataPanel />}
        {tab === 3 && <NotifyPanel />}
      </div>
    </div>
  );
}

/* ── 탭 1: 전체 현황 ── */
function OverviewPanel() {
  const [dealers, setDealers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [d, s] = await Promise.all([
        base44.entities.DealerInfo.list("-created_date", 500),
        base44.entities.SalesRecord.list("-created_date", 2000),
      ]);
      setDealers(d); setSales(s); setLoading(false);
    })();
  }, []);

  if (loading) return <Loader />;

  const todayRecs = sales.filter(s => s.sale_date === today);
  const todaySalesTotal = todayRecs.reduce((a, s) => a + (s.sales_amount || 0), 0);
  const activeCount = dealers.filter(d => d.status === "active").length;
  const pendingCount = dealers.filter(d => d.status === "pending").length;

  const summaryCards = [
    { label: "총 활성 딜러", value: `${activeCount}명`, color: "text-blue-400" },
    { label: "오늘 총 매출", value: `₩${todaySalesTotal.toLocaleString()}`, color: "text-yellow-400" },
    { label: "오늘 등록 건수", value: `${todayRecs.length}건`, color: "text-emerald-400" },
    { label: "승인 대기 중", value: `${pendingCount}건`, color: "text-orange-400" },
  ];

  // dealer today sales table
  const dealerRows = dealers
    .filter(d => d.status === "active")
    .map(d => {
      const dTodayRecs = todayRecs.filter(s => s.dealer_name === d.dealer_name);
      const dTotalRecs = sales.filter(s => s.dealer_name === d.dealer_name);
      return {
        ...d,
        todaySales: dTodayRecs.reduce((a, s) => a + (s.sales_amount || 0), 0),
        todayCount: dTodayRecs.length,
        totalSales: dTotalRecs.reduce((a, s) => a + (s.sales_amount || 0), 0),
      };
    })
    .sort((a, b) => b.todaySales - a.todaySales);

  const activeDealers = dealerRows.filter(d => d.todaySales > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map(c => (
          <SFCard key={c.label}>
            <p className="text-[10px] text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </SFCard>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">딜러별 오늘 매출</h3>
        {activeDealers.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">오늘 매출 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["대리점명", "등급", "오늘 매출", "오늘 건수", "누적 매출"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {dealerRows.map(d => (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                    <td className="py-3 px-2"><GradeBadge grade={d.grade || "GREEN"} /></td>
                    <td className="py-3 px-2 text-white font-bold">₩{d.todaySales.toLocaleString()}</td>
                    <td className="py-3 px-2 text-gray-400">{d.todayCount}건</td>
                    <td className="py-3 px-2 text-gray-400">₩{d.totalSales.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 탭 2: 딜러 계정 관리 ── */
function DealerAccountPanel() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [gradeMap, setGradeMap] = useState({});

  useEffect(() => {
    base44.entities.DealerInfo.list("-created_date", 500)
      .then(d => {
        setDealers(d);
        const gm = {}; d.filter(x => x.status === "pending").forEach(x => gm[x.id] = "GREEN");
        setGradeMap(gm);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateDealer = async (id, data) => {
    setUpdating(id);
    await base44.entities.DealerInfo.update(id, data);
    setDealers(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    setUpdating(null);
  };

  const approveDealer = async (id) => {
    const grade = gradeMap[id] || "GREEN";
    await updateDealer(id, { status: "active", grade });
  };

  const pending = dealers.filter(d => d.status === "pending");
  const filtered = statusFilter === "all" ? dealers : dealers.filter(d => d.status === statusFilter);

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {/* Section A: 승인 대기 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">승인 대기 대리점</h3>
          {pending.length > 0 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending.length}건</span>}
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-gray-600 py-6 text-center">승인 대기 중인 계정이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["가입일", "대리점명", "대리점주", "연락처", "지역", "추천코드", "등급 설정", "처리"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pending.map(d => (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-gray-500">{d.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                    <td className="py-3 px-2 text-gray-300">{d.owner_name}</td>
                    <td className="py-3 px-2 text-gray-400">{d.phone}</td>
                    <td className="py-3 px-2 text-gray-500">{d.region || "-"}</td>
                    <td className="py-3 px-2 text-gray-500">{d.referral_code || "-"}</td>
                    <td className="py-3 px-2">
                      <select value={gradeMap[d.id] || "GREEN"} onChange={e => setGradeMap(p => ({ ...p, [d.id]: e.target.value }))}
                        className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-[10px]">
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => approveDealer(d.id)} disabled={updating === d.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                          ✅ 승인
                        </button>
                        <button onClick={() => updateDealer(d.id, { status: "rejected" })} disabled={updating === d.id}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">
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

      {/* Section B: 전체 딜러 계정 */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">전체 딜러 계정</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {[["all", "전체"], ["active", "활성"], ["pending", "대기"], ["suspended", "정지"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === v ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점명", "대리점주", "지역", "등급", "상태", "가입일", "등급 변경", "액션"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                  <td className="py-3 px-2 text-gray-300">{d.owner_name}</td>
                  <td className="py-3 px-2 text-gray-500">{d.region || "-"}</td>
                  <td className="py-3 px-2"><GradeBadge grade={d.grade || "GREEN"} /></td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      d.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      d.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{d.status === "active" ? "활성" : d.status === "pending" ? "대기" : d.status === "rejected" ? "거절" : "정지"}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{d.created_date?.split("T")[0]}</td>
                  <td className="py-3 px-2">
                    <select value={d.grade || "GREEN"} onChange={e => updateDealer(d.id, { grade: e.target.value })} disabled={updating === d.id}
                      className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-[10px] disabled:opacity-50">
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => updateDealer(d.id, { status: d.status === "active" ? "suspended" : "active" })} disabled={updating === d.id}
                        className={`px-2 py-1 rounded text-[10px] transition-all disabled:opacity-50 ${d.status === "active" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                        {d.status === "active" ? "정지" : "활성화"}
                      </button>
                      <button onClick={() => updateDealer(d.id, { password: "0000" })} disabled={updating === d.id}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-[10px] hover:bg-yellow-500/30 transition-all disabled:opacity-50">
                        PW초기화
                      </button>
                    </div>
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

/* ── 탭 3: 매출 데이터 ── */
function SalesDataPanel() {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [allSales, setAllSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.SalesRecord.list("-sale_date", 5000).then(setAllSales).finally(() => setLoading(false));
  }, []);

  const periodSales = allSales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate);

  // dealer grouping
  const dealerGroups = Object.values(periodSales.reduce((acc, s) => {
    const k = s.dealer_name;
    acc[k] = acc[k] || { dealer_name: k, total: 0, count: 0, new: 0, existing: 0, duplicate: 0 };
    acc[k].total += s.sales_amount || 0;
    acc[k].count += 1;
    if (s.customer_status === "new") acc[k].new += 1;
    else if (s.customer_status === "existing") acc[k].existing += 1;
    else if (s.customer_status === "duplicate") acc[k].duplicate += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  const filtered = periodSales.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.customer_name?.toLowerCase().includes(q) || r.phone?.includes(q) || r.dealer_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.customer_status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="text-xs text-gray-400 block mb-1">시작일</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
        </div>
        <span className="text-gray-600 text-xs pb-2">~</span>
        <div>
          <label className="text-xs text-gray-400 block mb-1">종료일</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
        </div>
        <p className="text-xs text-gray-500 pb-2">{periodSales.length}건 조회됨</p>
      </div>

      {/* Dealer grouping table */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">딜러별 매출 집계</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점명", "매출합계", "건수", "신규", "기존", "중복"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {dealerGroups.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-xs text-gray-600">해당 기간 매출 없음</td></tr>
              ) : dealerGroups.map(d => (
                <tr key={d.dealer_name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                  <td className="py-3 px-2 text-white font-bold">₩{d.total.toLocaleString()}</td>
                  <td className="py-3 px-2 text-gray-400">{d.count}건</td>
                  <td className="py-3 px-2 text-yellow-400">{d.new}</td>
                  <td className="py-3 px-2 text-emerald-400">{d.existing}</td>
                  <td className="py-3 px-2 text-red-400">{d.duplicate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full transaction list */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">전체 거래 목록</h3>
        <div className="flex gap-2 flex-wrap mb-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객명 / 연락처 / 대리점 검색"
            className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
          {["all", "new", "existing", "duplicate"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400"}`}>
              {s === "all" ? "전체" : s === "new" ? "신규" : s === "existing" ? "기존" : "중복"}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["날짜", "대리점명", "고객명", "연락처", "매출", "SOF수량", "상태"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.slice(0, 200).map(r => (
                <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 text-gray-500">{r.sale_date}</td>
                  <td className="py-2.5 px-2 text-gray-400">{r.dealer_name}</td>
                  <td className="py-2.5 px-2 text-white">{r.customer_name}</td>
                  <td className="py-2.5 px-2 text-gray-400">{r.phone}</td>
                  <td className="py-2.5 px-2 text-white">₩{(r.sales_amount || 0).toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-blue-400">{r.final_quantity?.toFixed(1)}</td>
                  <td className="py-2.5 px-2"><StatusBadge status={r.customer_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-600 mt-2">{filtered.length}건 (최대 200건 표시)</p>
        </div>
      </div>
    </div>
  );
}

/* ── 탭 4: 알림/전송 ── */
function NotifyPanel() {
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState("전체");
  const [date, setDate] = useState(today);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [dlStart, setDlStart] = useState(monthStart);
  const [dlEnd, setDlEnd] = useState(today);
  const [dlDealer, setDlDealer] = useState("전체");

  useEffect(() => {
    base44.entities.DealerInfo.list("-created_date", 200).then(setDealers);
  }, []);

  const log = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ${msg}`, ...prev]);

  const send = async () => {
    setSending(true);
    try {
      const body = { date };
      if (selectedDealer !== "전체") body.dealer_name = selectedDealer;
      const res = await fetch(`${API}/sales/send-telegram`, {
        method: "POST", headers: { ...Auth.headers(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      log(`✅ ${data.message || "전송 완료"}`);
    } catch (e) {
      log(`❌ 전송 실패: ${e.message}`);
    }
    setSending(false);
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ start: dlStart, end: dlEnd });
      if (dlDealer !== "전체") params.append("dealer", dlDealer);
      const res = await fetch(`${API}/sales/excel?${params}`, { headers: Auth.headers() });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `solfort_sales_${dlStart}_${dlEnd}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      log("✅ 엑셀 다운로드 완료");
    } catch (e) {
      log(`❌ 다운로드 실패: ${e.message}`);
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-5 max-w-lg">
      {/* Section A: 텔레그램 */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">텔레그램 전송</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400">대리점 선택</label>
            <select value={selectedDealer} onChange={e => setSelectedDealer(e.target.value)}
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
          <button onClick={send} disabled={sending}
            className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50">
            {sending ? "전송 중..." : "📤 텔레그램 전송"}
          </button>
        </div>
      </SFCard>

      {/* Section B: 엑셀 다운로드 */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">엑셀 다운로드</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400">시작일</label>
              <input type="date" value={dlStart} onChange={e => setDlStart(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">종료일</label>
              <input type="date" value={dlEnd} onChange={e => setDlEnd(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">대리점 선택</label>
            <select value={dlDealer} onChange={e => setDlDealer(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
              <option value="전체">전체</option>
              {dealers.map(d => <option key={d.id} value={d.dealer_name}>{d.dealer_name}</option>)}
            </select>
          </div>
          <button onClick={downloadExcel} disabled={downloading}
            className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
            {downloading ? "준비 중..." : "📥 엑셀 다운로드"}
          </button>
        </div>
      </SFCard>

      {/* 로그 */}
      {logs.length > 0 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-2">처리 결과</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {logs.map((l, i) => <p key={i} className="text-xs text-gray-400 font-mono">{l}</p>)}
          </div>
        </SFCard>
      )}
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
}