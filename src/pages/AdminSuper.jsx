import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import AdminHeader from "../components/AdminHeader";
import GradeBadge from "../components/GradeBadge";
import SFCard from "../components/SFCard";
import { ReportPanel } from "./AdminCall";
import PricingManager from "../components/PricingManager";
import MemberManagementPanel from "../components/MemberManagementPanel";
import SettlementPanel from "../components/SettlementPanel";
import SalesOrderPanel from "../components/SalesOrderPanel";
import DealerDetailModal from "../components/DealerDetailModal";
import ContentManagementPanel from "../components/ContentManagementPanel";
import AnomalyPanel from "../components/AnomalyPanel";
import SystemLogPanel from "../components/SystemLogPanel";
import { Logger } from "../lib/logger";

const API = "https://solfort-js.onrender.com";
const today = new Date().toISOString().split("T")[0];
const GRADES = ["GREEN", "PURPLE", "GOLD", "PLATINUM"];

const DEALER_TABS = ["전체 현황", "딜러 관리", "딜러 계정", "매출", "단가/요율", "정산", "물량 처리"];
const CALL_TABS = ["콜팀 현황", "콜팀 계정", "자동화", "조직도"];

export default function AdminSuper() {
  const [category, setCategory] = useState("overview"); // overview | dealer | call
  const [dealerTab, setDealerTab] = useState(0);
  const [callTab, setCallTab] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    base44.entities.SalesOrder.list("-created_date", 200)
      .then(orders => setPendingOrders(orders.filter(o => o.status === "pending").length))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="최고 관리자" accent="purple" />

      {/* Category Selector */}
      <div className="px-4 pt-3 pb-0 border-b border-white/[0.06]">
        <div className="flex gap-2 mb-3">
          {[["overview", "🏠 전체 현황"], ["dealer", "🏪 대리점 관리"], ["call", "📞 콜팀 관리"], ["content", "📋 콘텐츠 관리"], ["anomaly", "🔍 이상 감지"], ["syslog", "📋 시스템 로그"]].map(([k, l]) => (
            <button key={k} onClick={() => setCategory(k)}
              className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${category === k ? "bg-purple-500/20 text-purple-400 border-t border-x border-purple-500/30 border-b-0" : "bg-white/5 text-gray-400 hover:text-white"}`}>
              {l}
            </button>
          ))}
          {/* Pending badge */}
          {pendingOrders > 0 && (
            <button onClick={() => { setCategory("dealer"); setDealerTab(6); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-all animate-pulse">
              📦 물량 대기 <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingOrders}</span>
            </button>
          )}
        </div>

        {/* Sub-tabs */}
        {category === "dealer" && (
          <div className="flex overflow-x-auto gap-1 pb-3">
            {DEALER_TABS.map((t, i) => (
              <button key={i} onClick={() => setDealerTab(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dealerTab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
                {t}
                {i === 6 && pendingOrders > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{pendingOrders}</span>}
              </button>
            ))}
          </div>
        )}
        {category === "call" && (
          <div className="flex overflow-x-auto gap-1 pb-3">
            {CALL_TABS.map((t, i) => (
              <button key={i} onClick={() => setCallTab(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${callTab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {category === "overview" && <OverviewPanel onGoOrders={() => { setCategory("dealer"); setDealerTab(6); }} />}
        {category === "dealer" && (
          <>
            {dealerTab === 0 && <DealerOverview />}
            {dealerTab === 1 && <DealerManagement />}
            {dealerTab === 2 && <MemberManagementPanel />}
            {dealerTab === 3 && <SalesPanel />}
            {dealerTab === 4 && <PricingManager />}
            {dealerTab === 5 && <SettlementPanel />}
            {dealerTab === 6 && <SalesOrderPanel />}
          </>
        )}
        {category === "call" && (
          <>
            {callTab === 0 && <CallOverview />}
            {callTab === 1 && <CallAccountManagement />}
            {callTab === 2 && <CallAutomation />}
            {callTab === 3 && <CallOrgChart />}
          </>
        )}
        {category === "content" && <ContentManagementPanel />}
        {category === "anomaly" && <AnomalyPanel />}
        {category === "syslog" && <SystemLogPanel />}
      </div>
    </div>
  );
}

/* ── 전체 현황 ── */
function OverviewPanel({ onGoOrders }) {
  const [dealers, setDealers] = useState([]);
  const [sales, setSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, s, o] = await Promise.all([
          base44.entities.DealerInfo.list("-created_date", 200),
          base44.entities.SalesRecord.list("-created_date", 1000),
          base44.entities.SalesOrder.list("-created_date", 200),
        ]);
        setDealers(d); setSales(s); setOrders(o);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader />;

  const todaySales = sales.filter(s => s.sale_date === today);
  const totalRevenue = sales.reduce((a, s) => a + (s.sales_amount || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  const dealerRanking = Object.values(sales.reduce((acc, s) => {
    acc[s.dealer_name] = acc[s.dealer_name] || { name: s.dealer_name, total: 0 };
    acc[s.dealer_name].total += s.sales_amount || 0;
    return acc;
  }, {})).sort((a, b) => b.total - a.total).slice(0, 5);

  const stats = [
    { label: "전체 딜러", value: dealers.filter(d => d.status === "active").length + "명", color: "text-purple-400" },
    { label: "전체 매출", value: `₩${totalRevenue.toLocaleString()}`, color: "text-yellow-400" },
    { label: "오늘 등록", value: `${todaySales.length}건`, color: "text-emerald-400" },
    { label: "물량 대기", value: `${pendingOrders}건`, color: pendingOrders > 0 ? "text-red-400" : "text-gray-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <SFCard key={s.label} className={s.label === "물량 대기" && pendingOrders > 0 ? "cursor-pointer" : ""}
            onClick={() => s.label === "물량 대기" && pendingOrders > 0 && onGoOrders()}>
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </SFCard>
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
      <DealerOrgChart dealers={dealers} />
    </div>
  );
}

/* ── 대리점 조직도 ── */
function DealerOrgChart({ dealers: propDealers }) {
  const [dealers, setDealers] = useState(propDealers || []);
  const [updating, setUpdating] = useState(null);
  const isSuperAdmin = Auth.isSuperAdmin();

  const independents = dealers.filter(d => d.is_independent !== false && !d.parent_dealer_id);
  const subs = dealers.filter(d => d.parent_dealer_id);

  const makeIndependent = async (dealer) => {
    setUpdating(dealer.id);
    await base44.entities.DealerInfo.update(dealer.id, { is_independent: true, parent_dealer_id: null, parent_dealer_name: null });
    setDealers(prev => prev.map(d => d.id === dealer.id ? { ...d, is_independent: true, parent_dealer_id: null, parent_dealer_name: null } : d));
    setUpdating(null);
  };

  if (dealers.length === 0) return null;

  return (
    <SFCard>
      <h3 className="text-xs font-semibold text-gray-400 mb-4">🏢 대리점 조직도</h3>
      <div className="space-y-3">
        {independents.filter(d => d.status === "active").map(parent => {
          const children = subs.filter(s => s.parent_dealer_id === parent.id);
          const samGrade = children.filter(c => c.grade === parent.grade);
          return (
            <div key={parent.id}>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-xs">📦</span>
                <span className="text-sm text-white font-medium">{parent.dealer_name}</span>
                <GradeBadge grade={parent.grade || "GREEN"} />
              </div>
              {children.map(sub => {
                const sameGrade = sub.grade === parent.grade;
                return (
                  <div key={sub.id} className="ml-6 mt-1.5 flex items-center gap-2">
                    <span className="text-gray-600 text-[10px]">└──</span>
                    <span className="text-xs text-gray-300">{sub.dealer_name}</span>
                    <GradeBadge grade={sub.grade || "GREEN"} />
                    {sameGrade && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">🔔 등급 동일 - 분리 가능</span>
                    )}
                    {sameGrade && isSuperAdmin && (
                      <button onClick={() => makeIndependent(sub)} disabled={updating === sub.id}
                        className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded hover:bg-purple-500/30 disabled:opacity-50">
                        독립 처리
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {independents.filter(d => d.status === "active").length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">조직도 데이터 없음</p>
        )}
      </div>
    </SFCard>
  );
}

/* ── 딜러 현황 탭 ── */
function DealerOverview() {
  const [dealers, setDealers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDealer, setSelectedDealer] = useState(null);
  const isSuperAdmin = Auth.isSuperAdmin();

  useEffect(() => {
    Promise.all([
      base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 200),
      base44.entities.SalesRecord.list("-created_date", 2000),
    ]).then(([d, s]) => { setDealers(d); setSales(s); setLoading(false); });
  }, []);

  const todaySales = (name) => sales.filter(s => s.dealer_name === name && s.sale_date === today).reduce((a, s) => a + (s.sales_amount || 0), 0);
  const totalSales = (name) => sales.filter(s => s.dealer_name === name).reduce((a, s) => a + (s.sales_amount || 0), 0);

  const filtered = dealers.filter(d => {
    const q = search.toLowerCase();
    return !q || d.dealer_name?.toLowerCase().includes(q) || d.owner_name?.toLowerCase().includes(q) || d.phone?.includes(q);
  });

  if (loading) return <Loader />;

  return (
    <>
      <div className="space-y-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점명", "대리점주", "등급", "오늘매출", "누적매출", "등급변경"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2">
                    <button onClick={() => setSelectedDealer(d)} className="text-white font-medium hover:text-purple-400 transition-colors text-left">
                      {d.dealer_name}
                    </button>
                  </td>
                  <td className="py-3 px-2 text-gray-400">{d.owner_name}</td>
                  <td className="py-3 px-2"><GradeBadge grade={d.grade || "GREEN"} /></td>
                  <td className="py-3 px-2 text-white">₩{todaySales(d.dealer_name).toLocaleString()}</td>
                  <td className="py-3 px-2 text-white">₩{totalSales(d.dealer_name).toLocaleString()}</td>
                  <td className="py-3 px-2">
                    {isSuperAdmin ? (
                      <div className="flex gap-1 flex-wrap">
                        {GRADES.map(g => (
                          <GradeBtn key={g} grade={g} current={d.grade} dealerId={d.id} dealerName={d.dealer_name} onUpdate={(id, grade) => setDealers(prev => prev.map(x => x.id === id ? { ...x, grade } : x))} />
                        ))}
                      </div>
                    ) : <GradeBadge grade={d.grade || "GREEN"} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedDealer && <DealerDetailModal dealer={selectedDealer} onClose={() => setSelectedDealer(null)} />}
    </>
  );
}

function GradeBtn({ grade, current, dealerId, dealerName, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const change = async () => {
    if (current === grade) return;
    setLoading(true);
    await base44.entities.DealerInfo.update(dealerId, { grade });
    Logger.log("grade_change", Auth.getDealerName(), Auth.getRole(), dealerName, "등급 변경", current, grade);
    onUpdate(dealerId, grade);
    setLoading(false);
  };
  return (
    <button onClick={change} disabled={loading || current === grade}
      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${current === grade ? "bg-purple-500/30 text-purple-300" : "bg-white/5 text-gray-500 hover:bg-white/10"}`}>
      {grade}
    </button>
  );
}

/* ── 딜러 관리 ── */
function DealerManagement() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const isSuperAdmin = Auth.isSuperAdmin();

  useEffect(() => {
    base44.entities.DealerInfo.list("-created_date", 500).then(setDealers).finally(() => setLoading(false));
  }, []);

  const updateDealer = async (id, data) => {
    setUpdating(id);
    await base44.entities.DealerInfo.update(id, data);
    setDealers(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    setUpdating(null);
  };

  const pending = dealers.filter(d => d.status === "pending");
  const base = statusFilter === "all" ? dealers : dealers.filter(d => d.status === statusFilter);
  const filtered = base.filter(d => {
    const q = search.toLowerCase();
    return !q || d.dealer_name?.toLowerCase().includes(q) || d.owner_name?.toLowerCase().includes(q) || d.phone?.includes(q);
  });

  if (loading) return <Loader />;

  return (
    <>
      <div className="space-y-8">
        {/* Pending */}
        {pending.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-white">승인 대기</h3>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending.length}건</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                  {["가입일", "대리점명", "대리점주", "연락처", "추천코드", "처리"].map(h => (
                    <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pending.map(d => (
                    <tr key={d.id} className="border-b border-white/[0.04]">
                      <td className="py-3 px-2 text-gray-500">{d.created_date?.split("T")[0]}</td>
                      <td className="py-3 px-2 text-white">{d.dealer_name}</td>
                      <td className="py-3 px-2 text-gray-300">{d.owner_name}</td>
                      <td className="py-3 px-2 text-gray-400">{d.phone}</td>
                      <td className="py-3 px-2 text-gray-500">{d.referral_code || "-"}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1.5">
                          <button onClick={async () => { await updateDealer(d.id, { status: "active" }); Logger.log("approval", Auth.getDealerName(), Auth.getRole(), d.dealer_name, "가입 승인", "pending", "active"); }} disabled={updating === d.id}
                            className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">✅ 승인</button>
                          <button onClick={async () => { await updateDealer(d.id, { status: "rejected" }); Logger.log("approval", Auth.getDealerName(), Auth.getRole(), d.dealer_name, "가입 거절", "pending", "rejected"); }} disabled={updating === d.id}
                            className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">❌ 거절</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">전체 딜러 계정</h3>
          <div className="flex gap-2 mb-3 flex-wrap">
            {[["all", "전체"], ["active", "활성"], ["pending", "대기"], ["suspended", "정지"]].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
                {l}
              </button>
            ))}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
              className="ml-auto bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 w-48" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["대리점명", "대리점주", "등급", "상태", "가입일", "등급변경", "액션"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2">
                      <button onClick={() => setSelectedDealer(d)} className="text-white font-medium hover:text-purple-400 transition-colors">
                        {d.dealer_name}
                      </button>
                    </td>
                    <td className="py-3 px-2 text-gray-300">{d.owner_name}</td>
                    <td className="py-3 px-2"><GradeBadge grade={d.grade || "GREEN"} /></td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${d.status === "active" ? "bg-emerald-500/20 text-emerald-400" : d.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {d.status === "active" ? "활성" : d.status === "pending" ? "대기" : "정지"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-500">{d.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2">
                      {isSuperAdmin ? (
                        <select value={d.grade || "GREEN"} onChange={e => updateDealer(d.id, { grade: e.target.value })} disabled={updating === d.id}
                          className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-[10px] disabled:opacity-50">
                          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      ) : <span className="text-gray-600 text-[10px]">읽기전용</span>}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => updateDealer(d.id, { status: d.status === "active" ? "suspended" : "active" })} disabled={updating === d.id}
                          className={`px-2 py-1 rounded text-[10px] disabled:opacity-50 ${d.status === "active" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                          {d.status === "active" ? "정지" : "활성화"}
                        </button>
                        <button onClick={() => updateDealer(d.id, { password: "0000" })} disabled={updating === d.id}
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
      {selectedDealer && <DealerDetailModal dealer={selectedDealer} onClose={() => setSelectedDealer(null)} />}
    </>
  );
}

/* ── 매출 탭 ── */
function SalesPanel() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const now = new Date();
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
  const [endDate, setEndDate] = useState(today);
  const isSuperAdmin = Auth.isSuperAdmin();

  useEffect(() => {
    base44.entities.SalesRecord.list("-sale_date", 5000).then(setSales).finally(() => setLoading(false));
  }, []);

  const period = sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate);
  const filtered = period.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.customer_name?.toLowerCase().includes(q) || r.phone?.includes(q) || r.dealer_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.customer_status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-end">
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
        <p className="text-xs text-gray-500 pb-2">{period.length}건</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
          className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
        {["all", "new", "existing", "duplicate"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {s === "all" ? "전체" : s === "new" ? "신규" : s === "existing" ? "기존" : "중복"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["날짜", "대리점명", "고객명", "연락처", "매출", "SOF", "상태"].map(h => (
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
                <td className="py-2.5 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${r.customer_status === "new" ? "bg-yellow-500/20 text-yellow-400" : r.customer_status === "existing" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {r.customer_status === "new" ? "신규" : r.customer_status === "existing" ? "기존" : "중복"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-600 mt-2">{filtered.length}건 (최대 200건 표시)</p>
      </div>
    </div>
  );
}

/* ── 콜팀 현황 ── */
function CallOverview() {
  const [records, setRecords] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SalesRecord.list("-created_date", 1000),
      base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 200),
      base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 200),
    ]).then(([r, c, d]) => { setRecords(r); setCallMembers(c); setDealers(d); setLoading(false); });
  }, []);

  if (loading) return <Loader />;

  const todayRecs = records.filter(r => r.sale_date === today);
  const total = todayRecs.reduce((a, r) => a + (r.sales_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "오늘 등록", value: `${todayRecs.length}건`, color: "text-emerald-400" },
          { label: "오늘 매출", value: `₩${total.toLocaleString()}`, color: "text-yellow-400" },
          { label: "활성 콜팀", value: `${callMembers.length}명`, color: "text-blue-400" },
        ].map(c => (
          <SFCard key={c.label}><p className="text-[10px] text-gray-500">{c.label}</p><p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p></SFCard>
        ))}
      </div>
      <SFCard>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">일괄 텔레그램 전송</h3>
        <TelegramSender />
      </SFCard>
    </div>
  );
}

function TelegramSender() {
  const [date, setDate] = useState(today);
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState("");
  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/telegram/send`, { method: "POST", headers: Auth.headers(), body: JSON.stringify({ dealer: "전체", date }) });
      const data = await res.json();
      setLog(`✅ ${data.message || "전송 완료"}`);
    } catch (e) { setLog(`❌ ${e.message}`); }
    setSending(false);
  };
  return (
    <div className="flex gap-2">
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
      <button onClick={send} disabled={sending} className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-lg text-xs disabled:opacity-50">
        {sending ? "전송 중..." : "📤 전송"}
      </button>
      {log && <p className="text-xs self-center text-gray-400">{log}</p>}
    </div>
  );
}

/* ── 콜팀 계정 관리 ── */
function CallAccountManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    base44.entities.CallTeamMember.list("-created_date", 500).then(setMembers).finally(() => setLoading(false));
  }, []);

  const update = async (id, data) => {
    setUpdating(id);
    await base44.entities.CallTeamMember.update(id, data);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    setUpdating(null);
  };

  const pending = members.filter(m => m.status === "pending");
  const base = statusFilter === "all" ? members : members.filter(m => m.status === statusFilter);
  const filtered = base.filter(m => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q) || m.team?.toLowerCase().includes(q);
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white">콜팀 승인 대기</h3>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["가입일", "이름", "아이디", "연락처", "소속팀", "처리"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pending.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.04]">
                    <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                    <td className="py-3 px-2 text-gray-500">{m.username}</td>
                    <td className="py-3 px-2 text-gray-400">{m.phone}</td>
                    <td className="py-3 px-2 text-gray-400">{m.team || "-"}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => update(m.id, { status: "active" })} disabled={updating === m.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">✅ 승인</button>
                        <button onClick={() => update(m.id, { status: "rejected" })} disabled={updating === m.id}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">❌ 거절</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">전체 콜팀 계정</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          {[["all", "전체"], ["active", "활성"], ["pending", "대기"], ["suspended", "정지"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
              {l}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
            className="ml-auto bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 w-48" />
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
                  <td className="py-3 px-2 text-gray-400">{m.team || "-"}</td>
                  <td className="py-3 px-2 text-gray-400">{m.phone}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.status === "active" ? "bg-emerald-500/20 text-emerald-400" : m.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                      {m.status === "active" ? "활성" : m.status === "pending" ? "대기" : "정지"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => update(m.id, { status: m.status === "active" ? "suspended" : "active" })} disabled={updating === m.id}
                        className={`px-2 py-1 rounded text-[10px] disabled:opacity-50 ${m.status === "active" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {m.status === "active" ? "정지" : "활성화"}
                      </button>
                      <button onClick={() => update(m.id, { password: "0000" })} disabled={updating === m.id}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-[10px] disabled:opacity-50">
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

/* ── 콜팀 자동화 ── */
function CallAutomation() {
  const [date, setDate] = useState(today);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const addLog = msg => setLogs(p => [`[${new Date().toLocaleTimeString("ko-KR")}] ${msg}`, ...p]);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/telegram/send`, { method: "POST", headers: Auth.headers(), body: JSON.stringify({ dealer: "전체", date }) });
      const data = await res.json();
      addLog(`✅ ${data.message || "전송 완료"}`);
    } catch (e) { addLog(`❌ ${e.message}`); }
    setSending(false);
  };

  return (
    <div className="max-w-md space-y-4">
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">일괄 텔레그램 전송</h3>
        <div className="space-y-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          <button onClick={send} disabled={sending}
            className="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-500/30 disabled:opacity-50">
            {sending ? "전송 중..." : "📤 전송"}
          </button>
        </div>
      </SFCard>
      {logs.length > 0 && (
        <SFCard>
          {logs.map((l, i) => <p key={i} className="text-xs text-gray-400 font-mono">{l}</p>)}
        </SFCard>
      )}
    </div>
  );
}

/* ── 콜팀 조직도 ── */
function CallOrgChart() {
  const [members, setMembers] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const isSuperAdmin = Auth.isSuperAdmin();
  const isCallAdmin = Auth.isCallAdmin();
  const canEdit = isSuperAdmin || isCallAdmin;

  useEffect(() => {
    Promise.all([
      base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 200),
      base44.entities.CallTeamHierarchy.list("-created_date", 200),
    ]).then(([m, h]) => { setMembers(m); setHierarchy(h); setLoading(false); });
  }, []);

  const setLeader = async (member, team) => {
    setSaving(member.id);
    const existing = hierarchy.find(h => h.member_id === member.id);
    const data = { member_id: member.id, member_name: member.name, username: member.username, position: "leader", team_name: team, status: "active" };
    let updated;
    if (existing) {
      updated = await base44.entities.CallTeamHierarchy.update(existing.id, data);
      setHierarchy(prev => prev.map(h => h.id === existing.id ? { ...h, ...data } : h));
    } else {
      updated = await base44.entities.CallTeamHierarchy.create(data);
      setHierarchy(prev => [...prev, updated]);
    }
    setSaving(null);
  };

  const setVacant = async (team) => {
    setSaving(team);
    const data = { member_id: "", member_name: "공석", position: "leader", team_name: team, status: "vacant" };
    const existing = hierarchy.find(h => h.team_name === team && h.position === "leader");
    if (existing) {
      await base44.entities.CallTeamHierarchy.update(existing.id, data);
      setHierarchy(prev => prev.map(h => h.id === existing.id ? { ...h, ...data } : h));
    } else {
      const created = await base44.entities.CallTeamHierarchy.create(data);
      setHierarchy(prev => [...prev, created]);
    }
    setSaving(null);
  };

  if (loading) return <Loader />;

  const teams = [...new Set([...hierarchy.map(h => h.team_name), ...members.map(m => m.team).filter(Boolean)])].filter(Boolean);

  return (
    <div className="space-y-5">
      {canEdit && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">팀 추가</h3>
          <div className="flex gap-2">
            <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="팀명 입력 (예: A팀)"
              className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
            <button onClick={() => { if (teamName) { setHierarchy(prev => [...prev, { id: `tmp_${Date.now()}`, team_name: teamName, position: "leader", status: "vacant", member_name: "공석" }]); setTeamName(""); }}}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs">추가</button>
          </div>
        </SFCard>
      )}

      <div className="space-y-4">
        {teams.map(team => {
          const leader = hierarchy.find(h => h.team_name === team && h.position === "leader");
          const teamMembers = members.filter(m => m.team === team);
          return (
            <SFCard key={team}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">👥 {team}</h3>
              </div>
              <div className="space-y-2">
                {/* Leader */}
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <span className="text-xs text-gray-400">팀장:</span>
                  {leader?.status === "vacant" || !leader ? (
                    <span className="text-xs text-gray-600">공석</span>
                  ) : (
                    <span className="text-xs text-white font-medium">{leader.member_name}</span>
                  )}
                  {canEdit && (
                    <div className="ml-auto flex gap-1">
                      <select onChange={e => { const m = members.find(x => x.id === e.target.value); if (m) setLeader(m, team); }}
                        className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-[10px]" defaultValue="">
                        <option value="" disabled>팀장 지정</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button onClick={() => setVacant(team)} disabled={saving === team}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-[10px] hover:bg-yellow-500/30 disabled:opacity-50">공석</button>
                    </div>
                  )}
                </div>
                {/* Members */}
                {teamMembers.map(m => (
                  <div key={m.id} className="ml-6 flex items-center gap-2">
                    <span className="text-gray-600 text-[10px]">└──</span>
                    <span className="text-xs text-gray-300">{m.name}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">활성</span>
                  </div>
                ))}
                {teamMembers.length === 0 && <p className="ml-6 text-[10px] text-gray-600">팀원 없음</p>}
              </div>
            </SFCard>
          );
        })}
        {teams.length === 0 && <p className="text-xs text-gray-600 text-center py-8">콜팀 조직도 데이터 없음<br />CallTeamMember의 team 필드를 설정하세요</p>}
      </div>
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}