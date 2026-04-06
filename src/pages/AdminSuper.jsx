import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import { toast } from "sonner";
import AdminHeader from "../components/AdminHeader";
import GradeBadge from "../components/GradeBadge";
import SFCard from "../components/SFCard";
import { ReportPanel } from "./AdminCall";
import PricingManager from "../components/PricingManager";
import MemberManagementPanel from "../components/MemberManagementPanel";
import SettlementPanel from "../components/SettlementPanel";
import SalesOrderPanel from "../components/SalesOrderPanel";
import ManagerAccountPanel from "../components/ManagerAccountPanel";
import DealerDetailModal from "../components/DealerDetailModal";
import ContentManagementPanel from "../components/ContentManagementPanel";
import AnomalyPanel from "../components/AnomalyPanel";
import SystemLogPanel from "../components/SystemLogPanel";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import { Logger } from "../lib/logger";
import { useNavigate } from "react-router-dom";

const API = "https://solfort-js.onrender.com";
const today = new Date().toISOString().split("T")[0];
const GRADES = ["GREEN", "PURPLE", "GOLD", "PLATINUM"];

const DEALER_TABS = ["전체 현황", "딜러 관리", "딜러 계정", "매니저 계정", "매출", "단가/요율", "정산", "물량 처리"];
const CALL_TABS = ["콜팀 현황", "콜팀 계정", "자동화", "조직도", "콜 모니터링"];
const ONLINE_TABS = ["온라인팀"];

function ManagerCreationSection() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", username: "", password: "", assigned_dealer: "" });
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    base44.entities.DealerInfo.list("-created_date", 500)
      .then(d => setDealers(d.filter(x => x.status === "active")))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.username || !formData.password || !formData.assigned_dealer) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.DealerInfo.create({
        dealer_name: formData.name,
        username: formData.username,
        password: formData.password,
        role: "manager",
        status: "active",
        assigned_dealer: formData.assigned_dealer,
      });
      toast.success("매니저 계정이 생성되었습니다.");
      setFormData({ name: "", username: "", password: "", assigned_dealer: "" });
    } catch (e) {
      toast.error("매니저 계정 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SFCard className="mb-5">
      <h3 className="text-sm font-semibold text-white mb-4">🆕 매니저 계정 생성</h3>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="이름"
          value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600"
        />
        <input
          type="text"
          placeholder="아이디"
          value={formData.username}
          onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600"
        />
        <select
          value={formData.assigned_dealer}
          onChange={e => setFormData(p => ({ ...p, assigned_dealer: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
        >
          <option value="" disabled>담당대리점 선택</option>
          {dealers.map(d => <option key={d.id} value={d.dealer_name}>{d.dealer_name}</option>)}
        </select>
        <button
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 py-2 rounded-lg text-xs font-medium hover:bg-purple-500/30 disabled:opacity-50"
        >
          {submitting ? "생성 중..." : "✅ 생성"}
        </button>
      </div>
    </SFCard>
  );
}

export default function AdminSuper() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("overview");
  const [dealerTab, setDealerTab] = useState(0);
  const [callTab, setCallTab] = useState(0);
  const [onlineTab, setOnlineTab] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    base44.entities.SalesOrder.list("-created_date", 200)
      .then(orders => setPendingOrders(orders.filter(o => o.status === "pending").length))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="최고 관리자" accent="purple" />
      <OperationSummary />

      {/* Category Selector */}
      <div className="px-4 pt-3 pb-0 border-b border-white/[0.06]">
        <div className="flex gap-2 mb-3 items-center">
          {[["overview", "🏠 전체 현황"], ["dealer", "🏪 대리점 관리"], ["call", "📞 콜팀 관리"], ["online", "💻 온라인팀 관리"], ["merged", "👥 전체 가입자 통합"], ["content", "📋 콘텐츠 관리"], ["anomaly", "🔍 이상 감지"], ["syslog", "📋 시스템 로그"]].map(([k, l]) => (
            <button key={k} onClick={() => setCategory(k)}
              className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${category === k ? "bg-purple-500/20 text-purple-400 border-t border-x border-purple-500/30 border-b-0" : "bg-white/5 text-gray-400 hover:text-white"}`}>
              {l}
            </button>
          ))}
          {/* Shortcut buttons */}
          <button onClick={() => navigate("/analytics")}
            className="ml-auto px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30 transition-all">📊 분석 대시보드</button>
          <button onClick={() => navigate("/online-director")}
            className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 transition-all">💻 온라인팀 관리</button>
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
        {category === "online" && (
          <div className="flex overflow-x-auto gap-1 pb-3">
            {ONLINE_TABS.map((t, i) => (
              <button key={i} onClick={() => setOnlineTab(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${onlineTab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {category === "overview" && <OverviewPanel onGoOrders={() => { setCategory("dealer"); setDealerTab(6); }} />}
        {category === "merged" && <MergedUsersPanel />}
        {category === "dealer" && (
          <>
            {dealerTab === 0 && <DealerOverview />}
            {dealerTab === 1 && <DealerManagement />}
            {dealerTab === 2 && <MemberManagementPanel />}
            {dealerTab === 3 && <><ManagerCreationSection /><ManagerAccountPanel /></>}
            {dealerTab === 4 && <SalesPanel />}
            {dealerTab === 5 && <PricingManager />}
            {dealerTab === 6 && <SettlementPanel />}
            {dealerTab === 7 && <SalesOrderPanel />}
          </>
        )}
        {category === "call" && (
          <>
            {callTab === 0 && <CallOverview />}
            {callTab === 1 && <CallAccountManagement />}
            {callTab === 2 && <CallAutomation />}
            {callTab === 3 && <CallOrgChart />}
            {callTab === 4 && <CallAutomationLive />}
          </>
        )}
        {category === "online" && (
          <>
            {onlineTab === 0 && <OnlineTeamPanel />}
          </>
        )}
        {category === "content" && <ContentManagementPanel />}
        {category === "anomaly" && <AnomalyPanel />}
        {category === "syslog" && <SystemLogPanel />}
      </div>
    </div>
  );
}

/* ── 운영 현황 요약 카드 ── */
function OperationSummary() {
  const [data, setData] = useState(null);

  const load = async () => {
    const [dealers, callMembers, onlineMembers, sales] = await Promise.all([
      base44.entities.DealerInfo.list("-created_date", 500),
      base44.entities.CallTeamMember.list("-created_date", 500),
      base44.entities.OnlineTeamMember.list("-created_date", 200),
      base44.entities.SalesRecord.list("-sale_date", 5000),
    ]);
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const todayStr = now.toISOString().split("T")[0];

    const monthSales = sales.filter(s => (s.sale_date || "").startsWith(thisMonth));
    // Dealer sales = records where dealer_name matches a dealer
    const dealerNames = new Set(dealers.filter(d => d.role === "dealer" || !d.role || d.role === "dealer").map(d => d.dealer_name));
    const dealerMonthlySales = monthSales.filter(s => dealerNames.has(s.dealer_name)).reduce((a, s) => a + (s.sales_amount || 0), 0);
    // Call team sales = records linked via converted leads (dealer_name not in dealer list)
    const callMonthlySales = monthSales.filter(s => !dealerNames.has(s.dealer_name)).reduce((a, s) => a + (s.sales_amount || 0), 0);
    const totalMonthlySales = monthSales.reduce((a, s) => a + (s.sales_amount || 0), 0);

    const pendingApprovals = dealers.filter(d => d.status === "pending").length
      + callMembers.filter(m => m.status === "pending").length
      + onlineMembers.filter(m => m.status === "pending").length;

    const todayNew = dealers.filter(d => (d.created_date || "").startsWith(todayStr)).length
      + callMembers.filter(m => (m.created_date || "").startsWith(todayStr)).length
      + onlineMembers.filter(m => (m.created_date || "").startsWith(todayStr)).length;

    setData({
      dealerTotal: dealers.filter(d => d.role !== "manager").length,
      dealerActive: dealers.filter(d => d.status === "active" && d.role !== "manager").length,
      dealerPending: dealers.filter(d => d.status === "pending").length,
      callTotal: callMembers.length,
      callActive: callMembers.filter(m => m.status === "active").length,
      callPending: callMembers.filter(m => m.status === "pending").length,
      onlineTotal: onlineMembers.length,
      onlineActive: onlineMembers.filter(m => m.status === "active").length,
      onlinePending: onlineMembers.filter(m => m.status === "pending").length,
      totalMonthlySales,
      dealerMonthlySales,
      callMonthlySales,
      onlineDbCount: onlineMembers.filter(m => m.status === "active").length,
      pendingApprovals,
      todayNew,
    });
  };

  useEffect(() => { load(); }, []);

  if (!data) return <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  const cards = [
    { label: "총 대리점", value: data.dealerTotal, sub: `활성 ${data.dealerActive} / 대기 ${data.dealerPending}` },
    { label: "총 콜팀", value: data.callTotal, sub: `활성 ${data.callActive} / 대기 ${data.callPending}` },
    { label: "온라인팀", value: data.onlineTotal, sub: `활성 ${data.onlineActive} / 대기 ${data.onlinePending}` },
    { label: "이달 총매출", value: `₩${(data.totalMonthlySales / 10000).toFixed(0)}만`, sub: "대리점+콜팀 합산" },
    { label: "이달 대리점 매출", value: `₩${(data.dealerMonthlySales / 10000).toFixed(0)}만`, sub: "이달 대리점" },
    { label: "이달 콜팀 매출", value: `₩${(data.callMonthlySales / 10000).toFixed(0)}만`, sub: "이달 콜팀" },
    { label: "온라인팀 DB수", value: data.onlineDbCount, sub: "이달 활성 온라인팀" },
    { label: "미처리 승인대기", value: data.pendingApprovals, sub: "전체 미승인 인원", urgent: data.pendingApprovals > 0 },
    { label: "오늘 신규 가입", value: data.todayNew, sub: "오늘 신청 건수", urgent: data.todayNew > 0 },
  ];

  return (
    <div className="px-4 pt-4 pb-0">
      <p className="text-xs text-gray-500 font-semibold mb-3">📊 운영 현황</p>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
        {cards.map(c => (
          <div key={c.label} className="bg-[#0d1a12] border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.urgent ? "text-red-400" : "text-emerald-400"}`}>{c.value}</p>
            <p className="text-[9px] text-gray-600 mt-0.5">{c.sub}</p>
          </div>
        ))}
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

  const pendingDealers = dealers.filter(d => d.status === "pending");
  const baseDealers = statusFilter === "all" ? dealers : dealers.filter(d => d.status === statusFilter);
  const filteredDealers = baseDealers.filter(d => {
    const q = search.toLowerCase();
    return !q || d.dealer_name?.toLowerCase().includes(q) || d.owner_name?.toLowerCase().includes(q) || d.phone?.includes(q);
  });

  if (loading) return <Loader />;

  return (
    <>
      <div className="space-y-8">
        {/* Pending */}
          {pendingDealers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-white">승인 대기</h3>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pendingDealers.length}건</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                  {["가입일", "대리점명", "대리점주", "연락처", "추천코드", "처리"].map(h => (
                    <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pendingDealers.map(d => (
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
                 {filteredDealers.map(d => (
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

  useEffect(() => {
    base44.entities.SalesRecord.list("-sale_date", 5000).then(setSales).finally(() => setLoading(false));
  }, []);

  const period = sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate);
  const filteredSales = period.filter(r => {
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
            {filteredSales.slice(0, 200).map(r => (
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
        <p className="text-xs text-gray-600 mt-2">{filteredSales.length}건 (최대 200건 표시)</p>
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

  const pendingMembers = members.filter(m => m.status === "pending");
  const baseMembers = statusFilter === "all" ? members : members.filter(m => m.status === statusFilter);
  const filteredMembers = baseMembers.filter(m => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q) || m.team?.toLowerCase().includes(q);
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {pendingMembers.length > 0 && (
       <div>
         <div className="flex items-center gap-2 mb-3">
           <h3 className="text-sm font-semibold text-white">콜팀 승인 대기</h3>
           <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pendingMembers.length}건</span>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-xs">
               <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                 {["가입일", "이름", "아이디", "연락처", "소속팀", "처리"].map(h => (
                   <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                 ))}
               </tr></thead>
               <tbody>
                 {pendingMembers.map(m => (
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
              {filteredMembers.map(m => (
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

function MergedUsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    (async () => {
      const [dealers, callMembers] = await Promise.all([
        base44.entities.DealerInfo.list('-created_date', 500),
        base44.entities.CallTeamMember.list('-created_date', 500),
      ]);

      const mergedUsers = [
        ...dealers.map(d => ({
          ...d,
          _type: 'dealer',
          _typeLabel: '대리점',
          _icon: '🏪',
          _name: d.dealer_name,
          _username: d.username,
          _phone: d.phone,
          _role: d.role || 'dealer',
        })),
        ...callMembers.map(c => ({
          ...c,
          _type: 'call_team',
          _typeLabel: '콜팀',
          _icon: '📞',
          _name: c.name,
          _username: c.username,
          _phone: c.phone,
          _role: c.role || 'call_team',
        })),
      ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setUsers(mergedUsers);
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter(u => {
    const typeMatch = typeFilter === 'all' || u._type === typeFilter || (typeFilter === 'manager' && u._role === 'manager');
    const statusMatch = statusFilter === 'all' || u.status === statusFilter;
    const q = search.toLowerCase();
    const searchMatch = !q || u._name?.toLowerCase().includes(q) || u._username?.toLowerCase().includes(q) || u._phone?.includes(q);
    return typeMatch && statusMatch && searchMatch;
  });

  const getRoleIcon = (type, role) => {
    if (type === 'dealer' && role === 'manager') return '🔑';
    if (type === 'dealer') return '🏪';
    if (type === 'call_team') return '📞';
    return '👤';
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex gap-1">
          {['all', 'dealer', 'call_team', 'manager'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${typeFilter === t ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-gray-400'}` }>
              {t === 'all' ? '전체' : t === 'dealer' ? '대리점' : t === 'call_team' ? '콜팀' : '매니저'}
            </button>
          ))}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
          <option value="all">상태: 전체</option>
          <option value="active">활성</option>
          <option value="pending">대기</option>
          <option value="suspended">정지</option>
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름/아이디/연락처 검색"
          className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {['구분', '이름', '아이디', '연락처', '역할', '상태', '가입일', '약관동의'].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} onClick={() => setSelectedUser(u)} className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer">
                <td className="py-3 px-2"><span className="text-lg">{getRoleIcon(u._type, u._role)}</span></td>
                <td className="py-3 px-2 text-white font-medium">{u._name}</td>
                <td className="py-3 px-2 text-gray-500">{u._username}</td>
                <td className="py-3 px-2 text-gray-400">{u._phone}</td>
                <td className="py-3 px-2 text-gray-400">{u._role}</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : u.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}` }>
                    {u.status === 'active' ? '활성' : u.status === 'pending' ? '대기' : '정지'}
                  </span>
                </td>
                <td className="py-3 px-2 text-gray-500">{u.created_date?.split('T')[0]}</td>
                <td className="py-3 px-2 text-center">{u.agreed_contract_version ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <SFCard className="max-w-lg max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{selectedUser._name}</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['구분', `${selectedUser._icon} ${selectedUser._typeLabel}`],
                ['이름', selectedUser._name],
                ['아이디', selectedUser._username],
                ['연락처', selectedUser._phone],
                ['역할', selectedUser._role],
                ['상태', selectedUser.status],
                ['가입일', selectedUser.created_date?.split('T')[0]],
                ['약관동의', selectedUser.agreed_contract_version ? '✅' : '❌'],
                ...(selectedUser._type === 'dealer' ? [
                  ['대리점주', selectedUser.owner_name],
                  ['지역', selectedUser.region || '-'],
                  ['등급', selectedUser.grade || '-'],
                  ['추천코드', selectedUser.referral_code || '-'],
                ] : []),
                ...(selectedUser._type === 'call_team' ? [
                  ['소속팀', selectedUser.team || '-'],
                  ['사원번호', selectedUser.employee_id || '-'],
                ] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
          </SFCard>
        </div>
      )}
    </div>
  );
}

/* ── 콜 모니터링 ── */
const STATUS_BADGE_CALL = {
  신규: "bg-gray-500/20 text-gray-400", 연락됨: "bg-blue-500/20 text-blue-400",
  관심있음: "bg-emerald-500/20 text-emerald-400", 거절: "bg-red-500/20 text-red-400",
  매출전환: "bg-purple-500/20 text-purple-400",
};
const RESULT_BADGE_CALL = {
  미응답: "bg-gray-500/20 text-gray-400", 연결됨: "bg-blue-500/20 text-blue-400",
  관심없음: "bg-red-500/20 text-red-400", 관심있음: "bg-emerald-500/20 text-emerald-400",
  재콜필요: "bg-yellow-500/20 text-yellow-400", 매출전환: "bg-purple-500/20 text-purple-400",
};

/* ── 온라인팀 패널 ── */
function OnlineTeamPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    base44.entities.OnlineTeamMember.list("-created_date", 200).then(setMembers).finally(() => setLoading(false));
  }, []);

  const updateMember = async (id, data) => {
    setUpdating(id);
    await base44.entities.OnlineTeamMember.update(id, data);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    setUpdating(null);
  };

  if (loading) return <Loader />;

  const pending = members.filter(m => m.status === "pending");

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white">승인 대기</h3>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["가입일", "이름", "아이디", "연락처", "메타 계정", "처리"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pending.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.04]">
                    <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                    <td className="py-3 px-2 text-gray-500">{m.username}</td>
                    <td className="py-3 px-2 text-gray-400">{m.phone || "-"}</td>
                    <td className="py-3 px-2 text-gray-300 max-w-[150px] truncate">{m.meta_ad_account || "-"}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => updateMember(m.id, { status: "active" })} disabled={updating === m.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">✅ 승인</button>
                        <button onClick={() => updateMember(m.id, { status: "rejected" })} disabled={updating === m.id}
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
        <h3 className="text-sm font-semibold text-white mb-3">전체 온라인팀 계정</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["이름", "아이디", "연락처", "메타 계정", "상태", "가입일", "액션"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                  <td className="py-3 px-2 text-gray-500">{m.username}</td>
                  <td className="py-3 px-2 text-gray-400">{m.phone || "-"}</td>
                  <td className="py-3 px-2 text-gray-300 max-w-[150px] truncate">{m.meta_ad_account || "-"}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {m.status === "active" ? "활성" : "대기"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button onClick={() => updateMember(m.id, { status: m.status === "active" ? "suspended" : "active" })} disabled={updating === m.id}
                        className={`px-2 py-1 rounded text-[10px] disabled:opacity-50 ${m.status === "active" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                        {m.status === "active" ? "퇴출" : "복구"}
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

function CallAutomationLive() {
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const todayStr = new Date().toISOString().split("T")[0];
  const timerRef = useRef(null);

  const load = () => Promise.all([
    base44.entities.CallLead.list("-created_date", 500),
    base44.entities.CallLog.list("-called_at", 200),
  ]).then(([l, lg]) => { setLeads(l); setLogs(lg); setLoading(false); });

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (loading) return <Loader />;

  const todayLogs = logs.filter(l => (l.called_at || "").startsWith(todayStr));
  const todayInterest = todayLogs.filter(l => l.call_result === "관심있음");
  const todayConverted = leads.filter(l => l.status === "매출전환" && (l.converted_at || "").startsWith(todayStr));
  const activeLeads = leads.filter(l => l.status !== "거절" && l.status !== "매출전환");
  const convertedLeads = leads.filter(l => l.status === "매출전환");
  const filteredLeads = leads.filter(l => {
    const q = search.toLowerCase();
    const ms = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.assigned_to?.toLowerCase().includes(q);
    const mf = statusFilter === "전체" || l.status === statusFilter || (statusFilter === "신규" && l.status === "new");
    return ms && mf;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">콜팀 실시간 현황</h2>
        <span className="text-[10px] text-gray-500">30초 자동 갱신</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "오늘 총 콜 수", value: todayLogs.length, color: "text-blue-400" },
          { label: "오늘 관심 고객", value: todayInterest.length, color: "text-emerald-400" },
          { label: "오늘 매출 전환", value: todayConverted.length, color: "text-purple-400" },
          { label: "전체 활성 리드", value: activeLeads.length, color: "text-yellow-400" },
        ].map(s => (
          <SFCard key={s.label}><p className="text-[10px] text-gray-500">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></SFCard>
        ))}
      </div>
      <SFCard>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">실시간 콜 기록 피드 (최근 20건)</h3>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-600 py-4 text-center">콜 기록 없음</p>
        ) : (
          <div className="space-y-0 max-h-64 overflow-y-auto">
            {logs.slice(0, 20).map(l => (
              <div key={l.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0 text-xs">
                <span className="text-gray-600 text-[10px] w-20 shrink-0">{(l.called_at || "").replace("T", " ").substring(0, 16)}</span>
                <span className="text-blue-400 shrink-0 w-16 truncate">{l.called_by}</span>
                <span className="text-white flex-1 font-medium truncate">{l.lead_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${RESULT_BADGE_CALL[l.call_result] || "bg-white/5 text-gray-400"}`}>{l.call_result}</span>
              </div>
            ))}
          </div>
        )}
      </SFCard>
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">리드 현황 ({filteredLeads.length}건)</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 / 연락처 / 담당자 검색"
            className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
          {["전체", "신규", "연락됨", "관심있음", "거절", "매출전환"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>{s}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["등록일", "고객명", "연락처", "담당자", "상태", "관심도", "관심금액", "다음콜"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredLeads.slice(0, 100).map(l => (
                <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{(l.created_at || l.created_date || "").split("T")[0]}</td>
                  <td className="py-2.5 px-2 text-white font-medium">{l.name}</td>
                  <td className="py-2.5 px-2 text-gray-400">{l.phone}</td>
                  <td className="py-2.5 px-2 text-gray-500">{l.assigned_to || "-"}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_BADGE_CALL[l.status] || "bg-white/5 text-gray-400"}`}>{l.status === "new" ? "신규" : l.status}</span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-400">{l.interest_level || "-"}</td>
                  <td className="py-2.5 px-2 text-emerald-400">{l.interest_amount ? `₩${Number(l.interest_amount).toLocaleString()}` : "-"}</td>
                  <td className="py-2.5 px-2 text-yellow-400">{l.next_call_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {convertedLeads.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">매출 전환 현황 ({convertedLeads.length}건)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["전환일", "고객명", "담당자", "연결 대리점", "관심 금액"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {convertedLeads.map(l => (
                  <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2 text-gray-500">{(l.converted_at || "").split("T")[0]}</td>
                    <td className="py-2.5 px-2 text-white font-medium">{l.name}</td>
                    <td className="py-2.5 px-2 text-gray-400">{l.assigned_to || "-"}</td>
                    <td className="py-2.5 px-2 text-blue-400">{l.dealer_name || "-"}</td>
                    <td className="py-2.5 px-2 text-emerald-400">{l.interest_amount ? `₩${Number(l.interest_amount).toLocaleString()}` : "-"}</td>
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