import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import AdminHeader from "../components/AdminHeader";
import GradeBadge from "../components/GradeBadge";
import StatusBadge from "../components/StatusBadge";
import SFCard from "../components/SFCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const API = "https://solfort-js.onrender.com";
const TABS = ["전체 현황", "콜팀 계정 관리", "자동화", "리포트"];
const today = new Date().toISOString().split("T")[0];
const PERIOD_OPTIONS = [{ key: "today", label: "오늘" }, { key: "week", label: "이번주" }, { key: "month", label: "이번달" }, { key: "custom", label: "직접입력" }];
const COMMISSION_RATES = { GREEN: 10, PURPLE: 30, GOLD: 40, PLATINUM: 50 };

export default function AdminCall() {
  const [tab, setTab] = useState(0);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="콜팀 관리자" accent="emerald" />
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-emerald-500/10">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 0 && <OverviewPanel />}
        {tab === 1 && <CallAccountPanel />}
        {tab === 2 && <AutomationPanel />}
        {tab === 3 && <ReportPanel accent="emerald" />}
      </div>
    </div>
  );
}

/* ── 탭 1: 전체 현황 ── */
function OverviewPanel() {
  const [records, setRecords] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const load = async () => {
    const [r, d, c] = await Promise.all([
      base44.entities.SalesRecord.list("-created_date", 2000),
      base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 200),
      base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 200),
    ]);
    setRecords(r); setDealers(d); setCallMembers(c); setLoading(false);
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (loading) return <Loader />;

  const todayRecs = records.filter(r => r.sale_date === today);
  const todayTotal = todayRecs.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const todayNew = todayRecs.filter(r => r.customer_status === "new").length;

  const summaryCards = [
    { label: "오늘 총 등록", value: `${todayRecs.length}건`, color: "text-emerald-400" },
    { label: "오늘 총 매출", value: `₩${todayTotal.toLocaleString()}`, color: "text-yellow-400" },
    { label: "신규 고객", value: `${todayNew}명`, color: "text-blue-400" },
    { label: "활성 콜팀", value: `${callMembers.length}명`, color: "text-purple-400" },
  ];

  const dealerRows = dealers.map(d => {
    const dr = todayRecs.filter(r => r.dealer_name === d.dealer_name);
    return {
      ...d,
      todayCount: dr.length,
      todaySales: dr.reduce((a, r) => a + (r.sales_amount || 0), 0),
      newCount: dr.filter(r => r.customer_status === "new").length,
      existingCount: dr.filter(r => r.customer_status === "existing").length,
      duplicateCount: dr.filter(r => r.customer_status === "duplicate").length,
    };
  }).sort((a, b) => b.todaySales - a.todaySales);

  const recentFeed = [...records].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")).slice(0, 20);

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">딜러별 실시간 현황</h3>
          <span className="text-[10px] text-gray-500">30초 자동갱신</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점명", "등급", "오늘건수", "오늘매출", "신규", "기존", "중복"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {dealerRows.map(d => (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                  <td className="py-3 px-2"><GradeBadge grade={d.grade || "GREEN"} /></td>
                  <td className="py-3 px-2 text-gray-300">{d.todayCount}건</td>
                  <td className="py-3 px-2 text-white font-bold">₩{d.todaySales.toLocaleString()}</td>
                  <td className="py-3 px-2 text-yellow-400">{d.newCount}</td>
                  <td className="py-3 px-2 text-emerald-400">{d.existingCount}</td>
                  <td className="py-3 px-2 text-red-400">{d.duplicateCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SFCard>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">최근 등록 피드 (20건)</h3>
        <div className="space-y-0 max-h-72 overflow-y-auto">
          {recentFeed.length === 0 ? (
            <p className="text-xs text-gray-600 py-4 text-center">등록 내역 없음</p>
          ) : recentFeed.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-xs py-2.5 border-b border-white/[0.04] last:border-0">
              <span className="text-gray-600 text-[10px] shrink-0 w-12">{r.created_date ? new Date(r.created_date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : r.sale_date}</span>
              <span className="text-gray-500 shrink-0">{r.dealer_name}</span>
              <span className="text-white flex-1">{r.customer_name}</span>
              <span className="text-gray-300">₩{(r.sales_amount || 0).toLocaleString()}</span>
              <StatusBadge status={r.customer_status} />
            </div>
          ))}
        </div>
      </SFCard>
    </div>
  );
}

/* ── 탭 2: 콜팀 계정 관리 ── */
function CallAccountPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [editTeam, setEditTeam] = useState({});

  useEffect(() => {
    base44.entities.CallTeamMember.list("-created_date", 500).then(setMembers).finally(() => setLoading(false));
  }, []);

  const updateMember = async (id, data) => {
    setUpdating(id);
    await base44.entities.CallTeamMember.update(id, data);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    setUpdating(null);
  };

  const pending = members.filter(m => m.status === "pending");
  const filtered = statusFilter === "all" ? members : members.filter(m => m.status === statusFilter);

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {/* Section A: 승인 대기 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">콜팀 승인 대기</h3>
          {pending.length > 0 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending.length}건</span>}
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-gray-600 py-6 text-center">승인 대기 중인 콜팀원이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["가입일", "이름", "아이디", "연락처", "소속팀", "사원번호", "처리"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pending.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                    <td className="py-3 px-2 text-gray-500">{m.username}</td>
                    <td className="py-3 px-2 text-gray-400">{m.phone}</td>
                    <td className="py-3 px-2 text-gray-400">{m.team || "-"}</td>
                    <td className="py-3 px-2 text-gray-500">{m.employee_id || "-"}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => updateMember(m.id, { status: "active" })} disabled={updating === m.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                          ✅ 승인
                        </button>
                        <button onClick={() => updateMember(m.id, { status: "rejected" })} disabled={updating === m.id}
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

      {/* Section B: 전체 콜팀 계정 */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">전체 콜팀 계정</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {[["all", "전체"], ["active", "활성"], ["pending", "대기"], ["suspended", "정지"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === v ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["이름", "아이디", "소속팀", "연락처", "상태", "가입일", "액션"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                  <td className="py-3 px-2 text-gray-500">{m.username}</td>
                  <td className="py-3 px-2">
                    {editTeam[m.id] !== undefined ? (
                      <div className="flex gap-1">
                        <input value={editTeam[m.id]} onChange={e => setEditTeam(p => ({ ...p, [m.id]: e.target.value }))}
                          className="w-20 bg-white/5 border border-white/10 text-white rounded px-2 py-0.5 text-[10px]" />
                        <button onClick={async () => { await updateMember(m.id, { team: editTeam[m.id] }); setEditTeam(p => { const n = { ...p }; delete n[m.id]; return n; }); }}
                          className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">저장</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditTeam(p => ({ ...p, [m.id]: m.team || "" }))}
                        className="text-gray-400 hover:text-white transition-colors">{m.team || "-"}</button>
                    )}
                  </td>
                  <td className="py-3 px-2 text-gray-400">{m.phone}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      m.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      m.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{m.status === "active" ? "활성" : m.status === "pending" ? "대기" : "정지"}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => updateMember(m.id, { status: m.status === "active" ? "suspended" : "active" })} disabled={updating === m.id}
                        className={`px-2 py-1 rounded text-[10px] transition-all disabled:opacity-50 ${m.status === "active" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                        {m.status === "active" ? "정지" : "활성화"}
                      </button>
                      <button onClick={() => updateMember(m.id, { password: "0000" })} disabled={updating === m.id}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-[10px] hover:bg-yellow-500/30 disabled:opacity-50">
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

/* ── 탭 3: 자동화 ── */
function AutomationPanel() {
  const [dealers, setDealers] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [date, setDate] = useState(today);
  const [selectedDealers, setSelectedDealers] = useState(new Set());
  const [allChecked, setAllChecked] = useState(true);
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [reportDate, setReportDate] = useState(today);
  const [section, setSection] = useState(0);

  useEffect(() => {
    Promise.all([
      base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 200),
      base44.entities.SalesRecord.list("-created_date", 2000),
    ]).then(([d, s]) => {
      setDealers(d); setSalesData(s);
      setSelectedDealers(new Set(d.map(x => x.dealer_name)));
    });
  }, []);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ${msg}`, ...prev.slice(0, 49)]);

  const toggleDealer = (name) => {
    setSelectedDealers(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      setAllChecked(next.size === dealers.length);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) { setSelectedDealers(new Set()); setAllChecked(false); }
    else { setSelectedDealers(new Set(dealers.map(d => d.dealer_name))); setAllChecked(true); }
  };

  const sendTelegram = async () => {
    setSending(true);
    const targets = allChecked ? dealers : dealers.filter(d => selectedDealers.has(d.dealer_name));
    for (const d of targets) {
      try {
        const res = await fetch(`${API}/sales/send-telegram`, {
          method: "POST", headers: { ...Auth.headers(), "Content-Type": "application/json" },
          body: JSON.stringify({ dealer_name: d.dealer_name, date }),
        });
        const data = await res.json();
        addLog(`✅ ${d.dealer_name} 전송 완료 ${data.message ? `| ${data.message}` : ""}`);
      } catch (e) { addLog(`❌ ${d.dealer_name} 전송 실패 | ${e.message}`); }
    }
    setSending(false);
  };

  const sendReport = async () => {
    setReporting(true);
    try {
      const res = await fetch(`${API}/telegram/report`, {
        method: "POST", headers: { ...Auth.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ date: reportDate }),
      });
      const data = await res.json();
      addLog(`✅ 일일 리포트 전송 완료 | ${data.message || ""}`);
    } catch (e) { addLog(`❌ 리포트 전송 실패 | ${e.message}`); }
    setReporting(false);
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/sales/excel?date=${reportDate}`, { headers: Auth.headers() });
      if (!res.ok) throw new Error(`서버 오류 ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `solfort_${reportDate}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      addLog(`✅ 엑셀 다운로드 완료 (${reportDate})`);
    } catch (e) { addLog(`❌ 다운로드 실패 | ${e.message}`); }
    setDownloading(false);
  };

  // Report preview data
  const reportRecs = salesData.filter(r => r.sale_date === reportDate);
  const reportTotal = reportRecs.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const reportByDealer = Object.values(reportRecs.reduce((acc, r) => {
    acc[r.dealer_name] = acc[r.dealer_name] || { name: r.dealer_name, total: 0, count: 0 };
    acc[r.dealer_name].total += r.sales_amount || 0;
    acc[r.dealer_name].count += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {["텔레그램 전송", "일일 리포트", "전송 이력"].map((t, i) => (
          <button key={i} onClick={() => setSection(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${section === i ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>

      {section === 0 && (
        <div className="space-y-4 max-w-lg">
          <SFCard>
            <h3 className="text-sm font-semibold text-white mb-4">텔레그램 일괄 전송</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">날짜</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">대리점 선택</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-emerald-500" />
                    <span className="text-xs text-emerald-400 font-medium">전체 선택</span>
                  </label>
                  <div className="h-px bg-white/[0.06] my-1" />
                  {dealers.map(d => (
                    <label key={d.id} className="flex items-center gap-2 cursor-pointer py-1">
                      <input type="checkbox" checked={selectedDealers.has(d.dealer_name)} onChange={() => toggleDealer(d.dealer_name)} className="accent-emerald-500" />
                      <span className="text-xs text-gray-300">{d.dealer_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={sendTelegram} disabled={sending || selectedDealers.size === 0}
                className="w-full py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                {sending ? "전송 중..." : `📤 선택 딜러 전송 (${selectedDealers.size}개)`}
              </button>
            </div>
          </SFCard>
        </div>
      )}

      {section === 1 && (
        <div className="space-y-4 max-w-lg">
          <SFCard>
            <h3 className="text-sm font-semibold text-white mb-4">일일 리포트</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">날짜</label>
                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
              {/* Preview */}
              <div className="bg-white/[0.03] rounded-xl p-3 space-y-3">
                <p className="text-xs text-gray-400 font-semibold">리포트 미리보기</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    ["총 딜러", `${reportByDealer.length}개`],
                    ["총 매출", `₩${reportTotal.toLocaleString()}`],
                    ["신규", `${reportRecs.filter(r => r.customer_status === "new").length}건`],
                    ["기존", `${reportRecs.filter(r => r.customer_status === "existing").length}건`],
                    ["중복", `${reportRecs.filter(r => r.customer_status === "duplicate").length}건`],
                    ["총 건수", `${reportRecs.length}건`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[10px] text-gray-600">{l}</p>
                      <p className="text-white font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                {reportByDealer.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">TOP {Math.min(5, reportByDealer.length)} 딜러</p>
                    {reportByDealer.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs py-1">
                        <span className="text-gray-600 w-4">{i + 1}</span>
                        <span className="flex-1 text-gray-300">{d.name}</span>
                        <span className="text-white">₩{d.total.toLocaleString()}</span>
                        <span className="text-gray-500">{d.count}건</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={sendReport} disabled={reporting}
                  className="py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
                  {reporting ? "전송 중..." : "📤 텔레그램 전송"}
                </button>
                <button onClick={downloadExcel} disabled={downloading}
                  className="py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50">
                  {downloading ? "준비 중..." : "📥 엑셀 다운로드"}
                </button>
              </div>
            </div>
          </SFCard>
        </div>
      )}

      {section === 2 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">전송 이력 (최근 50건)</h3>
          {logs.length === 0 ? (
            <p className="text-xs text-gray-600 py-6 text-center">전송 이력이 없습니다</p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {logs.map((l, i) => (
                <p key={i} className={`text-xs font-mono ${l.includes("✅") ? "text-emerald-400" : "text-red-400"}`}>{l}</p>
              ))}
            </div>
          )}
        </SFCard>
      )}

      {/* Shared log (sections 0 & 1) */}
      {section !== 2 && logs.length > 0 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-2">처리 결과</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {logs.slice(0, 10).map((l, i) => (
              <p key={i} className={`text-xs font-mono ${l.includes("✅") ? "text-emerald-400" : "text-red-400"}`}>{l}</p>
            ))}
          </div>
        </SFCard>
      )}
    </div>
  );
}

/* ── 탭 4: 리포트 ── */
export function ReportPanel({ accent = "emerald" }) {
  const [period, setPeriod] = useState("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [records, setRecords] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SalesRecord.list("-created_date", 5000),
      base44.entities.DealerInfo.list("-created_date", 200),
    ]).then(([r, d]) => { setRecords(r); setDealers(d); setLoading(false); });
  }, []);

  const getRange = () => {
    const d = new Date();
    if (period === "today") return [today, today];
    if (period === "week") {
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      return [mon.toISOString().split("T")[0], today];
    }
    if (period === "month") return [today.slice(0, 7) + "-01", today];
    return [from, to];
  };

  const [start, end] = getRange();
  const filtered = records.filter(r => r.sale_date >= start && r.sale_date <= end);
  const total = filtered.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const newCount = filtered.filter(r => r.customer_status === "new").length;
  const existingCount = filtered.filter(r => r.customer_status === "existing").length;
  const dupCount = filtered.filter(r => r.customer_status === "duplicate").length;
  const avgPrice = filtered.length > 0 ? Math.round(total / filtered.length) : 0;

  const byDate = Object.values(filtered.reduce((acc, r) => {
    acc[r.sale_date] = acc[r.sale_date] || { date: r.sale_date.slice(5), 매출: 0 };
    acc[r.sale_date].매출 += Math.round((r.sales_amount || 0) / 10000);
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date));

  const pieData = [
    { name: "신규", value: newCount },
    { name: "기존", value: existingCount },
    { name: "중복", value: dupCount },
  ].filter(d => d.value > 0);
  const PIE_COLORS_STATUS = ["#facc15", "#10b981", "#ef4444"];

  const dealerRows = dealers.map(d => {
    const dr = filtered.filter(r => r.dealer_name === d.dealer_name);
    const dealerTotal = dr.reduce((a, r) => a + (r.sales_amount || 0), 0);
    const rate = COMMISSION_RATES[d.grade || "GREEN"];
    return { ...d, total: dealerTotal, count: dr.length, newC: dr.filter(r => r.customer_status === "new").length, commission: Math.round(dealerTotal * rate / 100) };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  const accentActive = accent === "emerald" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-purple-500/20 text-purple-400 border border-purple-500/30";
  const barColor = accent === "emerald" ? "#10b981" : "#8b5cf6";

  const exportCSV = () => {
    const headers = "대리점명,등급,매출합계,건수,신규,커미션";
    const rows = dealerRows.map(d => `${d.dealer_name},${d.grade},${d.total},${d.count},${d.newC},${d.commission}`);
    const blob = new Blob(["\uFEFF" + headers + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report_${start}_${end}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap items-center">
        {PERIOD_OPTIONS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${period === p.key ? `${accentActive} border` : "bg-white/5 text-gray-400"}`}>
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            <span className="text-gray-500 text-xs">~</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          </>
        )}
      </div>

      {loading ? <Loader /> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "총 매출", value: `₩${total.toLocaleString()}`, color: "text-yellow-400" },
              { label: "총 건수", value: `${filtered.length}건`, color: "text-white" },
              { label: "신규 비율", value: filtered.length > 0 ? `${Math.round(newCount / filtered.length * 100)}%` : "0%", color: "text-emerald-400" },
              { label: "평균 단가", value: `₩${avgPrice.toLocaleString()}`, color: "text-blue-400" },
            ].map(c => (
              <SFCard key={c.label}>
                <p className="text-[10px] text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
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
                    <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} formatter={v => `${v}만원`} />
                    <Bar dataKey="매출" fill={barColor} radius={[4, 4, 0, 0]} />
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
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS_STATUS[i]} />)}
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">딜러별 상세</h3>
                <button onClick={exportCSV} className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-all">
                  📥 CSV 다운로드
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                    {["대리점명", "등급", "매출합계", "건수", "신규", "기존", "커미션"].map(h => (
                      <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {dealerRows.map(d => (
                      <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                        <td className="py-3 px-2"><GradeBadge grade={d.grade || "GREEN"} /></td>
                        <td className="py-3 px-2 text-white font-bold">₩{d.total.toLocaleString()}</td>
                        <td className="py-3 px-2 text-gray-400">{d.count}건</td>
                        <td className="py-3 px-2 text-yellow-400">{d.newC}</td>
                        <td className="py-3 px-2 text-emerald-400">{d.count - d.newC}</td>
                        <td className="py-3 px-2 text-purple-400">₩{d.commission.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}