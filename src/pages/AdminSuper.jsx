import { useState, useEffect, useRef } from "react";
import { utils, writeFile } from "xlsx";
import BotManagementPanel from "../components/BotManagementPanel";
import CallAutomationLivePanel from "../components/CallAutomationLivePanel";
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
const ONLINE_TABS = ["온라인팀 계정"];
const ACCOUNT_TABS = ["딜러어드민 계정", "콜어드민 계정", "매니저 계정", "온라인디렉터 계정"];

function OnlineDirectorCreationSection() {
  const [formData, setFormData] = useState({ name: "", username: "", password: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      toast.error("이름, 아이디, 비밀번호를 입력해주세요."); return;
    }
    setSubmitting(true);
    try {
      await base44.entities.DealerInfo.create({
        dealer_name: formData.name,
        owner_name: formData.name,
        username: formData.username,
        password: formData.password,
        phone: formData.phone,
        role: "online_director",
        status: "active",
      });
      toast.success("온라인디렉터 계정이 생성되었습니다.");
      setFormData({ name: "", username: "", password: "", phone: "" });
    } catch (e) {
      toast.error("생성 실패: " + e.message);
    }
    setSubmitting(false);
  };

  return (
    <SFCard className="mb-5">
      <h3 className="text-sm font-semibold text-white mb-4">🌐 온라인디렉터 계정 생성</h3>
      <div className="space-y-3">
        {[["name","이름","text"],["username","아이디","text"],["password","비밀번호","password"],["phone","연락처","text"]].map(([k,p,t]) => (
          <input key={k} type={t} placeholder={p} value={formData[k]}
            onChange={e => setFormData(prev => ({ ...prev, [k]: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
        ))}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2 rounded-lg text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50">
          {submitting ? "생성 중..." : "✅ 생성"}
        </button>
      </div>
    </SFCard>
  );
}

function DealerAdminCreationSection() {
  const [formData, setFormData] = useState({ name: "", username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      toast.error("모든 필드를 입력해주세요."); return;
    }
    setSubmitting(true);
    try {
      await base44.entities.DealerInfo.create({
        dealer_name: formData.name, owner_name: formData.name,
        username: formData.username, password: formData.password,
        role: "dealer_admin", status: "active",
      });
      toast.success("딜러어드민 계정이 생성되었습니다.");
      setFormData({ name: "", username: "", password: "" });
    } catch (e) { toast.error("생성 실패: " + e.message); }
    setSubmitting(false);
  };

  return (
    <SFCard className="mb-5">
      <h3 className="text-sm font-semibold text-white mb-4">🏪 딜러어드민 계정 생성</h3>
      <div className="space-y-3">
        {[["name","이름","text"],["username","아이디","text"],["password","비밀번호","password"]].map(([k,p,t]) => (
          <input key={k} type={t} placeholder={p} value={formData[k]}
            onChange={e => setFormData(prev => ({ ...prev, [k]: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
        ))}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 py-2 rounded-lg text-xs font-medium hover:bg-purple-500/30 disabled:opacity-50">
          {submitting ? "생성 중..." : "✅ 생성"}
        </button>
      </div>
    </SFCard>
  );
}

function CallAdminCreationSection() {
  const [formData, setFormData] = useState({ name: "", username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      toast.error("모든 필드를 입력해주세요."); return;
    }
    setSubmitting(true);
    try {
      await base44.entities.CallTeamMember.create({
        name: formData.name, username: formData.username,
        password: formData.password, role: "call_admin", status: "active",
      });
      toast.success("콜어드민 계정이 생성되었습니다.");
      setFormData({ name: "", username: "", password: "" });
    } catch (e) { toast.error("생성 실패: " + e.message); }
    setSubmitting(false);
  };

  return (
    <SFCard className="mb-5">
      <h3 className="text-sm font-semibold text-white mb-4">📞 콜어드민 계정 생성</h3>
      <div className="space-y-3">
        {[["name","이름","text"],["username","아이디","text"],["password","비밀번호","password"]].map(([k,p,t]) => (
          <input key={k} type={t} placeholder={p} value={formData[k]}
            onChange={e => setFormData(prev => ({ ...prev, [k]: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
        ))}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2 rounded-lg text-xs font-medium hover:bg-blue-500/30 disabled:opacity-50">
          {submitting ? "생성 중..." : "✅ 생성"}
        </button>
      </div>
    </SFCard>
  );
}

function ManagerCreationSection() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", username: "", password: "", assigned_dealer: "" });
  const [submitting, setSubmitting] = useState(false);

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
  const [accountTab, setAccountTab] = useState(0);
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
        {/* 3 big primary section buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[["dealer","🏪 대리점 관리","purple"],["call","📞 콜팀 관리","blue"],["online","💻 온라인팀 관리","emerald"]].map(([k,l,c]) => (
            <button key={k} onClick={() => setCategory(k)}
              className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                category === k
                  ? `bg-${c}-500/20 text-${c}-400 border-${c}-500/30`
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
              }`}>{l}</button>
          ))}
        </div>
        {/* Secondary util buttons */}
        <div className="flex flex-wrap gap-1 mb-3">
          {[["overview","🏠 전체 현황"],["merged","👥 통합 가입자"],["accounts","🔑 계정 생성"],["content","📋 콘텐츠"],["event","🎉 이벤트"],["anomaly","🔍 이상 감지"],["syslog","📋 시스템 로그"]].map(([k,l]) => (
            <button key={k} onClick={() => setCategory(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === k ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400 hover:text-white"}`}>{l}</button>
          ))}
          <button onClick={() => setCategory("botmgmt")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === "botmgmt" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400 hover:text-white"}`}>🤖 봇 관리</button>
          <button onClick={() => navigate("/analytics")}
            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30 transition-all">📊 분석</button>
          <button onClick={() => navigate("/telegram-bot")}
            className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs hover:bg-cyan-500/30 transition-all">🤖 텔레그램봇</button>
          <button onClick={() => navigate("/incentive-settings")}
            className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs hover:bg-yellow-500/30 transition-all">💰 인센티브관리</button>
          <button onClick={() => navigate("/my-network")}
            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 transition-all">🌐 네트워크현황</button>
          {pendingOrders > 0 && (
            <button onClick={() => { setCategory("dealer"); setDealerTab(6); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-all animate-pulse">
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
                {t}{i === 6 && pendingOrders > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{pendingOrders}</span>}
              </button>
            ))}
          </div>
        )}
        {category === "call" && (
          <div className="flex overflow-x-auto gap-1 pb-3">
            {CALL_TABS.map((t, i) => (
              <button key={i} onClick={() => setCallTab(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${callTab === i ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400"}`}>
                {t}
              </button>
            ))}
          </div>
        )}
        {category === "online" && (
          <div className="flex overflow-x-auto gap-1 pb-3">
            {ONLINE_TABS.map((t, i) => (
              <button key={i} onClick={() => setOnlineTab(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${onlineTab === i ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
                {t}
              </button>
            ))}
          </div>
        )}
        {category === "accounts" && (
          <div className="flex overflow-x-auto gap-1 pb-3">
            {ACCOUNT_TABS.map((t, i) => (
              <button key={i} onClick={() => setAccountTab(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${accountTab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
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
            {callTab === 3 && <OrgChartPanel />}
            {callTab === 4 && <CallAutomationLivePanel />}
          </>
        )}
        {category === "online" && (
          <>
            {onlineTab === 0 && <OnlineTeamPanel />}
          </>
        )}
        {category === "accounts" && (
          <>
            {accountTab === 0 && <DealerAdminCreationSection />}
            {accountTab === 1 && <CallAdminCreationSection />}
            {accountTab === 2 && <><ManagerCreationSection /><ManagerAccountPanel /></>}
            {accountTab === 3 && <OnlineDirectorCreationSection />}
          </>
        )}
        {category === "content" && <ContentManagementPanel />}
        {category === "event" && <EventManagementPanel />}
        {category === "anomaly" && <AnomalyPanel />}
        {category === "syslog" && <SystemLogPanel />}
        {category === "botmgmt" && <BotManagementPanel />}
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
        <h3 className="text-xs font-semibold text-gray-400 mb-3">딜러 랝킹 TOP 5</h3>
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
      <ReferralRankingSection dealers={dealers} sales={sales} />
      <DealerOrgChart dealers={dealers} />
    </div>
  );
}

function ReferralRankingSection({ dealers, sales }) {
  const dealerMap = Object.fromEntries(dealers.map(d => [d.id, d]));

  const rows = dealers
    .filter(d => d.role !== 'manager')
    .map(d => {
      const direct = dealers.filter(x => x.parent_dealer_id === d.id);
      const directIds = new Set(direct.map(x => x.id));
      const indirect = dealers.filter(x => x.parent_dealer_id && directIds.has(dealerMap[x.parent_dealer_id]?.id));
      const networkNames = new Set([d.dealer_name, ...direct.map(x => x.dealer_name), ...indirect.map(x => x.dealer_name)]);
      const networkSales = sales.filter(s => networkNames.has(s.dealer_name)).reduce((a, s) => a + (s.sales_amount || 0), 0);
      return { id: d.id, name: d.dealer_name, code: d.referral_code || '-', direct: direct.length, indirect: indirect.length, networkSales };
    })
    .sort((a, b) => (b.direct + b.indirect) - (a.direct + a.indirect))
    .slice(0, 10);

  if (rows.every(r => r.direct === 0)) return null;

  return (
    <SFCard>
      <h3 className="text-xs font-semibold text-gray-400 mb-3">📊 추천코드 현황 TOP 10</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {['이름','추천코드','직추천수','간추천수','네트워크매출'].map(h => (
              <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-white/[0.04] last:border-0">
                <td className="py-2 px-2 text-white font-medium">{r.name}</td>
                <td className="py-2 px-2 text-gray-400 font-mono">{r.code}</td>
                <td className="py-2 px-2 text-emerald-400 font-bold">{r.direct}</td>
                <td className="py-2 px-2 text-blue-400">{r.indirect}</td>
                <td className="py-2 px-2 text-yellow-400">₩{(r.networkSales/10000).toFixed(0)}만</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SFCard>
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

/* ── 엑셀 고급 내보내기 ── */
function AdvancedExport() {
  const [exporting, setExporting] = useState(null);
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const buildRows = (records) => records.map(r => ({
    "날짜": r.sale_date || "",
    "고객명": r.customer_name || "",
    "연락처": r.phone || "",
    "매출금액": r.sales_amount || 0,
    "SOF수량": r.final_quantity || 0,
    "지갑주소": r.wallet_address || "",
    "메모": r.memo || "",
  }));

  const doExport = async (mode) => {
    setExporting(mode);
    try {
      const [sales, dealers, callMembers, onlineMembers] = await Promise.all([
        base44.entities.SalesRecord.list("-sale_date", 10000),
        base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 500),
        base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 500),
        base44.entities.OnlineTeamMember.list("-created_date", 500),
      ]);

      const wb = utils.book_new();
      const dealerNames = new Set(dealers.filter(d => d.role !== "manager").map(d => d.dealer_name));
      const callTeams = [...new Set(callMembers.map(m => m.team).filter(Boolean))];

      if (mode === "all" || mode === "dealer") {
        // One sheet per dealer
        dealers.filter(d => d.role !== "manager").forEach(d => {
          const rows = buildRows(sales.filter(s => s.dealer_name === d.dealer_name));
          if (rows.length > 0) {
            const ws = utils.json_to_sheet(rows);
            utils.book_append_sheet(wb, ws, d.dealer_name.slice(0, 31));
          }
        });
      }

      if (mode === "all" || mode === "call") {
        // One sheet per call team
        const callDealerNames = new Set(callMembers.map(m => m.name));
        // Group call-originated sales by team member's team
        const callSales = sales.filter(s => !dealerNames.has(s.dealer_name));
        callTeams.forEach(team => {
          const teamUsernames = callMembers.filter(m => m.team === team).map(m => m.username);
          const rows = buildRows(callSales.filter(s => teamUsernames.some(u => s.dealer_name?.includes(u) || s.created_by === u)));
          // fallback: just show all call sales if can't match
          const sheetRows = rows.length > 0 ? rows : buildRows(callSales.slice(0, 1000));
          const ws = utils.json_to_sheet(sheetRows);
          utils.book_append_sheet(wb, ws, `콜팀_${team}`.slice(0, 31));
        });
        if (callTeams.length === 0) {
          const ws = utils.json_to_sheet(buildRows(callSales));
          utils.book_append_sheet(wb, ws, "콜팀_전체");
        }
      }

      if (mode === "all" || mode === "online") {
        // Online team DB sheet
        const onlineRows = onlineMembers.map(m => ({
          "이름": m.name || "",
          "아이디": m.username || "",
          "연락처": m.phone || "",
          "메타 광고 계정": m.meta_ad_account || "",
          "상태": m.status || "",
          "가입일": (m.created_date || "").split("T")[0],
        }));
        const ws = utils.json_to_sheet(onlineRows);
        utils.book_append_sheet(wb, ws, "온라인팀_DB");
      }

      if (wb.SheetNames.length === 0) {
        utils.book_append_sheet(wb, utils.json_to_sheet([{ "데이터": "없음" }]), "데이터없음");
      }

      writeFile(wb, `SolFort_전체매출_${yearMonth}.xlsx`);
    } catch (e) {
      alert("내보내기 실패: " + e.message);
    }
    setExporting(null);
  };

  const btns = [
    { key: "all", label: "📊 전체 다운로드" },
    { key: "dealer", label: "🏪 대리점만" },
    { key: "call", label: "📞 콜팀만" },
    { key: "online", label: "💻 온라인팀만" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {btns.map(b => (
        <button key={b.key} onClick={() => doExport(b.key)} disabled={!!exporting}
          className="px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-all">
          {exporting === b.key ? "중..." : b.label}
        </button>
      ))}
      <span className="self-center text-[10px] text-gray-600">SolFort_전체매출_{yearMonth}.xlsx</span>
    </div>
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
      <AdvancedExport />
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

/* ── 통합 조직도 ── */
import OrgTree from "../components/OrgTree";

function OrgChartPanel() {
  const [subTab, setSubTab] = useState(0);
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.DealerInfo.list("-created_date", 500),
      base44.entities.CallTeamMember.list("-created_date", 500),
      base44.entities.OnlineTeamMember.list("-created_date", 200),
    ]).then(([d, c, o]) => { setDealers(d); setCallMembers(c); setOnlineMembers(o); setLoading(false); });
  }, []);

  if (loading) return <Loader />;

  // 대리점 조직도: region → root, dealers → children
  const regionMap = {};
  dealers.filter(d => d.role !== "manager").forEach(d => {
    const region = d.region || "미지정";
    if (!regionMap[region]) regionMap[region] = [];
    regionMap[region].push(d);
  });
  const dealerTree = Object.entries(regionMap).map(([region, list]) => ({
    id: region,
    name: region,
    role: "manager",
    children: list.map(d => ({ id: d.id, name: d.dealer_name, role: d.grade || "dealer", phone: d.phone, children: [] })),
  }));

  // 콜팀 조직도: team → root, members → children
  const teamMap = {};
  callMembers.forEach(m => {
    const team = m.team || "미배정";
    if (!teamMap[team]) teamMap[team] = [];
    teamMap[team].push(m);
  });
  const callTree = Object.entries(teamMap).map(([team, list]) => {
    const leader = list.find(m => m.role === "leader" || m.position === "leader");
    return {
      id: team,
      name: team,
      role: "leader",
      phone: leader?.phone || "",
      children: list.map(m => ({ id: m.id, name: m.name, role: m.role || "member", phone: m.phone, children: [] })),
    };
  });

  // 온라인팀 평트 리스트
  const onlineTree = onlineMembers.map(m => ({
    id: m.id,
    name: m.name,
    role: "member",
    phone: m.phone || m.meta_ad_account || "",
    children: [],
  }));

  const SUB_TABS = ["대리점조직도", "콜팀조직도", "온라인팀조직도"];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {SUB_TABS.map((t, i) => (
          <button key={i} onClick={() => setSubTab(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${subTab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>
      <SFCard>
        {subTab === 0 && <OrgTree data={dealerTree} title="🏪 대리점 지역별 조직도" />}
        {subTab === 1 && <OrgTree data={callTree} title="📞 콜팀 조직도" />}
        {subTab === 2 && <OrgTree data={onlineTree} title="💻 온라인팀 목록" />}
      </SFCard>
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

/* ── 이벤트 관리 ── */
function EventManagementPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", target: "전체", start_date: "", end_date: "", image_url: "" });

  const load = async () => {
    const data = await base44.entities.Event.list("-created_date", 100);
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.title || !form.content || !form.start_date || !form.end_date) {
      toast.error("필수 항목을 모두 입력해주세요."); return;
    }
    setSaving(true);
    const created = await base44.entities.Event.create({ ...form, is_active: true, created_by: Auth.getUsername?.() || "admin" });
    setEvents(prev => [created, ...prev]);
    setForm({ title: "", content: "", target: "전체", start_date: "", end_date: "", image_url: "" });
    toast.success("이벤트가 등록되었습니다.");
    setSaving(false);
  };

  const handleToggle = async (ev) => {
    setToggling(ev.id);
    await base44.entities.Event.update(ev.id, { is_active: !ev.is_active });
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_active: !e.is_active } : e));
    setToggling(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await base44.entities.Event.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success("이벤트가 삭제되었습니다.");
  };

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">🎉 이벤트 등록</h3>
        <div className="space-y-3">
          <input value={form.title} onChange={setF("title")} placeholder="제목 *"
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
          <textarea value={form.content} onChange={setF("content")} placeholder="내용 *" rows={3}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">대상</label>
              <select value={form.target} onChange={setF("target")}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                {["전체", "대리점", "콜팀", "온라인팀"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">이미지 URL (선택)</label>
              <input value={form.image_url} onChange={setF("image_url")} placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">시작일 *</label>
              <input type="date" value={form.start_date} onChange={setF("start_date")}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">종료일 *</label>
              <input type="date" value={form.end_date} onChange={setF("end_date")}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50">
            {saving ? "등록 중..." : "✅ 이벤트 등록"}
          </button>
        </div>
      </SFCard>

      {/* Event List */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">이벤트 목록 ({events.length}건)</h3>
        {loading ? <Loader /> : events.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">등록된 이벤트가 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["제목", "대상", "기간", "상태", "액션"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2">
                      <p className="text-white font-medium">{ev.title}</p>
                      <p className="text-[10px] text-gray-600 truncate max-w-[200px]">{ev.content}</p>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400">{ev.target}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-400 text-[10px] whitespace-nowrap">
                      {ev.start_date} ~ {ev.end_date}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ev.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-500"}`}>
                        {ev.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleToggle(ev)} disabled={toggling === ev.id}
                          className={`px-2 py-1 rounded text-[10px] disabled:opacity-50 transition-all ${ev.is_active ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                          {ev.is_active ? "비활성화" : "활성화"}
                        </button>
                        <button onClick={() => handleDelete(ev.id)}
                          className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px] hover:bg-red-500/30">
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SFCard>
    </div>
  );
}