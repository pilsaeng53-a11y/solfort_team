import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DealerInfo, SalesRecord, CallLead } from "../api/entities";
import { toast } from "sonner";
import SFLogo from "../components/SFLogo";
import SFCard from "../components/SFCard";
import UsdtBanner from "../components/UsdtBanner";
import GradeBadge, { GRADE_CONFIG } from "../components/GradeBadge";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import WalletDisplay from "../components/WalletDisplay";
import useMarketData from "../lib/useMarketData";
import useDealer from "../lib/useDealer";
import { UserPlus, FileText, Trophy, Send, TrendingUp, Users, DollarSign, Download, Check, X } from "lucide-react";
import { utils, writeFile } from "xlsx";

export default function Dashboard() {
  useEffect(() => { document.title = "SolFort - 대시보드"; }, []);
  const navigate = useNavigate();
  const { rate, source, loading: rateLoading, fetchRate } = useMarketData(30000);
  const { dealer, loading: dealerLoading } = useDealer();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [dispatchRequests, setDispatchRequests] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [activeEvents, setActiveEvents] = useState([]);
  const [recallLeads, setRecallLeads] = useState([]);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [connectedDealers, setConnectedDealers] = useState([]);
  const [connectedSales, setConnectedSales] = useState([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [badges, setBadges] = useState([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadRecords();
    CallLead.list({ next_call_date: today, status: '재콜예정' })
      .then(leads => setRecallLeads(leads))
      .catch(() => {});
    calculateBadges();
  }, []);

  useEffect(() => {
    if (dealer?.id && (dealer.position === '대리점지사장' || dealer.position === '대리점장')) {
      DealerInfo.filter({ parent_dealer_id: dealer.id })
        .then(async (dealers) => {
          setConnectedDealers(dealers);
          if (dealers.length > 0) {
            const sales = await SalesRecord.list();
            const names = new Set(dealers.map(d => d.dealer_name));
            setConnectedSales(sales.filter(s => names.has(s.dealer_name)));
          }
        })
        .catch(() => {});
    }
  }, [dealer]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const all = await SalesRecord.list();
      setRecords(all);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateBadges = async () => {
    if (!dealer?.id) return;
    const salesRecs = await SalesRecord.list();
    const myRecords = salesRecs.filter(r => r.dealer_name === dealer.dealer_name);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthRecords = myRecords.filter(r => r.sale_date?.startsWith(thisMonth));
    const thisMonthSales = thisMonthRecords.reduce((a, r) => a + (r.sales_amount || 0), 0);
    
    const allDealers = await DealerInfo.filter({ status: 'active' });
    const dealerSales = {};
    salesRecs.forEach(r => {
      if (!dealerSales[r.dealer_name]) dealerSales[r.dealer_name] = { month: 0, total: 0 };
      dealerSales[r.dealer_name].total += r.sales_amount || 0;
      if (r.sale_date?.startsWith(thisMonth)) dealerSales[r.dealer_name].month += r.sales_amount || 0;
    });
    const monthRanking = Object.entries(dealerSales).sort((a, b) => b[1].month - a[1].month);
    const isTopDealer = monthRanking[0]?.[0] === dealer.dealer_name;
    
    const earned = new Set();
    if (myRecords.length >= 1) earned.add('첫전환');
    if (myRecords.length >= 10) earned.add('10건달성');
    if (thisMonthSales >= (dealer.monthly_goal || 0)) earned.add('월목표달성');
    if (isTopDealer) earned.add('이달TOP');
    
    const dates = [...new Set(myRecords.map(r => r.sale_date).filter(Boolean))].sort();
    let maxConsecutive = 0, currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const curr = new Date(dates[i]);
      const prev = new Date(dates[i-1]);
      if ((curr - prev) / (1000 * 60 * 60 * 24) === 1) {
        currentStreak++;
        maxConsecutive = Math.max(maxConsecutive, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    if (maxConsecutive >= 5) earned.add('연속5일');
    
    const storedKey = `sf_badges_${dealer.id}`;
    const prevEarned = new Set(JSON.parse(localStorage.getItem(storedKey) || '[]'));
    const newBadges = [...earned].filter(b => !prevEarned.has(b));
    newBadges.forEach(b => {
      const badgeNames = { '첫전환': '🥇첫전환', '10건달성': '💎10건달성', '월목표달성': '🏆월목표달성', '연속5일': '🔥연속5일', '이달TOP': '🌟이달TOP' };
      toast(`🎉 새 배지 획득! ${badgeNames[b]}`);
    });
    localStorage.setItem(storedKey, JSON.stringify([...earned]));
    setBadges([...earned]);
  };

  const handleExcelDownload = async () => {
    const filtered = records.filter(r => r.dealer_name === dealer.dealer_name);
    const data = filtered.map(r => ({
      "날짜": r.sale_date || '',
      "고객명": r.customer_name || '',
      "연락처": r.phone || '',
      "매출금액": r.sales_amount || 0,
      "SOF수량": r.final_quantity || 0,
      "지갑주소": r.wallet_address || ''
    }));
    
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "매출현황");
    writeFile(wb, `내매출현황_${year}-${month}.xlsx`);
  };

  useEffect(() => {
    if (dealer) {
      const g = dealer.monthly_goal || 0;
      setMonthlyGoal(g);
      setGoalInput(g > 0 ? String(g) : "");
    }
  }, [dealer]);

  useEffect(() => {
    if (dealer?.dealer_name) {
      setOrders([]);
      setDispatchRequests([]);
    }
  }, [dealer]);

  const thisMonth = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; })();
  const monthRecords = records.filter(r => (r.sale_date || "").startsWith(thisMonth) && r.dealer_name === dealer?.dealer_name);
  const monthTotal = monthRecords.reduce((s, r) => s + (r.sales_amount || 0), 0);
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round(monthTotal / monthlyGoal * 100)) : 0;
  const goalBarColor = goalPct >= 70 ? "bg-emerald-500" : goalPct >= 30 ? "bg-yellow-500" : "bg-red-500";

  const saveGoal = async () => {
    const val = Number(goalInput.replace(/[^0-9]/g, ""));
    setSavingGoal(true);
    await DealerInfo.update(dealer.id, { monthly_goal: val });
    setMonthlyGoal(val);
    setEditingGoal(false);
    setSavingGoal(false);
  };

  const todayRecords = records.filter((r) => r.sale_date === today);
  const todaySales = todayRecords.reduce((sum, r) => sum + (r.sales_amount || 0), 0);
  const totalSales = records.reduce((sum, r) => sum + (r.sales_amount || 0), 0);
  const todayNew = todayRecords.filter((r) => r.customer_status === "new").length;
  const todayExisting = todayRecords.filter((r) => r.customer_status === "existing").length;
  const todayDuplicate = todayRecords.filter((r) => r.customer_status === "duplicate").length;
  const recentFive = todayRecords.slice(0, 5);

  if (dealerLoading) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!dealer) {
    navigate("/");
    return null;
  }

  const updateDispatchStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      const request = dispatchRequests.find(r => r.id === id);
      // MeetingDispatchRequest not in Neon API yet
      setDispatchRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      
      const statusLabel = newStatus === "accepted" ? "수락" : "거절";
      const msg = `[${dealer.dealer_name}] 파견요청 ${statusLabel}: ${request.customer_name}`;
      const botToken = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
      const chatId = "5757341051";
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg }),
      }).catch(() => {});
    } catch (e) {}
    setUpdating(null);
  };

  const grade = dealer.grade || "GREEN";
  const commission = GRADE_CONFIG[grade]?.commission || "10%";

  return (
    <div className="min-h-screen bg-[#080a12] relative overflow-hidden">
      <div className="absolute top-20 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-40 left-0 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Recall Alert */}
        {recallLeads.length > 0 && (
          <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-3 animate-pulse">
            <p className="text-sm font-bold text-orange-400">🔔 오늘 재콜 예정 {recallLeads.length}명 있습니다!</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {recallLeads.map(l => (
                <span key={l.id} className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">{l.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SFLogo size="sm" />
            <div>
              <h1 className="text-base font-bold text-white">{dealer.dealer_name}</h1>
              <p className="text-xs text-gray-500">{dealer.owner_name}</p>
            </div>
          </div>
          <GradeBadge grade={grade} showCommission />
        </div>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <div className="space-y-2">
            {activeEvents.map(ev => (
              <div key={ev.id} className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 border border-emerald-500/20 rounded-xl p-4">
                {ev.image_url && (
                  <img src={ev.image_url} alt={ev.title} className="w-full h-28 object-cover rounded-lg mb-3" />
                )}
                <p className="text-sm font-bold text-white">{ev.title}</p>
                <p className="text-xs text-gray-300 mt-1 whitespace-pre-line">{ev.content}</p>
                <p className="text-[10px] text-emerald-400/70 mt-2">{ev.start_date} ~ {ev.end_date}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Menu */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "🌐 내 네트워크", path: "/my-network" },
            { label: "💰 인센티브 설정", path: "/incentive-settings" },
            { label: "📊 리드 업로드", path: "/lead-upload" },
          ].map(btn => (
            <button key={btn.path} onClick={() => navigate(btn.path)}
              className="py-2 px-1 text-[10px] font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-xl hover:bg-emerald-500/20 transition-all text-center leading-tight">
              {btn.label}
            </button>
          ))}
        </div>

        {/* 내 추천코드 */}
        {dealer?.my_referral_code && (
          <SFCard>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">내 추천코드</p>
              <button onClick={() => { navigator.clipboard.writeText(dealer.my_referral_code).catch(() => {}); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-all">
                {copiedCode ? '✅ 복사됨' : '📋 복사'}
              </button>
            </div>
            <p className="text-xl font-bold text-emerald-400 tracking-widest mt-1 font-mono">{dealer.my_referral_code}</p>
          </SFCard>
        )}

        {/* USDT Rate */}
        <UsdtBanner rate={rate} source={source} loading={rateLoading} onRefresh={fetchRate} />

        {/* Grade Card */}
        <SFCard glow>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">현재 등급</p>
              <p className="text-lg font-bold text-white mt-1">{grade}</p>
              <p className="text-xs text-gray-400">커미션율 {commission}</p>
            </div>
            <div className="text-4xl opacity-30">
              {grade === "PLATINUM" ? "💎" : grade === "GOLD" ? "🏆" : grade === "PURPLE" ? "🔮" : "🌿"}
            </div>
          </div>
        </SFCard>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="오늘 매출"
            value={`₩${(todaySales / 10000).toFixed(0)}만`}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatCard
            label="누적 매출"
            value={`₩${(totalSales / 10000).toFixed(0)}만`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="오늘 건수"
            value={todayRecords.length}
            icon={<Users className="h-4 w-4" />}
          />
        </div>

        {/* Monthly Goal */}
        <SFCard>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">이달 목표</p>
            <button onClick={() => setEditingGoal(e => !e)} className="text-[10px] text-blue-400 hover:text-blue-300">
              {editingGoal ? "취소" : "수정"}
            </button>
          </div>
          {editingGoal ? (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="목표 금액 (원)"
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs placeholder:text-gray-600"
              />
              <button onClick={saveGoal} disabled={savingGoal}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 disabled:opacity-50">
                {savingGoal ? "저장중" : "저장"}
              </button>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">₩{monthTotal.toLocaleString()} / ₩{monthlyGoal.toLocaleString()}</span>
            <span className={`font-bold ${goalPct >= 70 ? "text-emerald-400" : goalPct >= 30 ? "text-yellow-400" : "text-red-400"}`}>{goalPct}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${goalBarColor}`} style={{ width: `${goalPct}%` }} />
          </div>
        </SFCard>

        {/* Today Status */}
        <SFCard>
          <p className="text-xs text-gray-500 mb-3">오늘 현황</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-sm">🟡</span>
              <span className="text-white text-sm font-medium">{todayNew}</span>
              <span className="text-xs text-gray-500">신규</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 text-sm">🟢</span>
              <span className="text-white text-sm font-medium">{todayExisting}</span>
              <span className="text-xs text-gray-500">기존</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-400 text-sm">🔴</span>
              <span className="text-white text-sm font-medium">{todayDuplicate}</span>
              <span className="text-xs text-gray-500">중복</span>
            </div>
          </div>
        </SFCard>

        {/* Badges */}
        <SFCard>
          <p className="text-xs text-gray-500 mb-3">🏅 내 배지</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: '첫전환', emoji: '🥇', name: '첫전환' },
              { id: '10건달성', emoji: '💎', name: '10건달성' },
              { id: '월목표달성', emoji: '🏆', name: '월목표달성' },
              { id: '연속5일', emoji: '🔥', name: '연속5일' },
              { id: '이달TOP', emoji: '🌟', name: '이달TOP' },
            ].map(b => {
              const earned = badges.includes(b.id);
              return (
                <div key={b.id} className={`rounded-xl p-3 text-center transition-all ${
                  earned ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/40' : 'bg-white/5 border border-white/10 opacity-50'
                }`}>
                  <p className="text-2xl">{b.emoji}</p>
                  <p className={`text-xs font-semibold mt-1 ${
                    earned ? 'text-yellow-300' : 'text-gray-500'
                  }`}>{b.name}</p>
                  {!earned && <p className="text-[9px] text-gray-600 mt-0.5">🔒</p>}
                </div>
              );
            })}
          </div>
        </SFCard>

        {/* Wallets */}
        <SFCard>
          <p className="text-xs text-gray-500 mb-2">지갑 주소</p>
          <WalletDisplay label="리베이트" address={dealer.rebate_wallet} />
          <WalletDisplay label="USDT" address={dealer.usdt_wallet} />
          <WalletDisplay label="백팩" address={dealer.backpack_wallet} />
          {!dealer.rebate_wallet && !dealer.usdt_wallet && !dealer.backpack_wallet && (
            <p className="text-xs text-gray-600 py-2">등록된 지갑이 없습니다</p>
          )}
        </SFCard>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "고객 등록", icon: UserPlus, path: "/register", primary: true },
            { label: "매출내역", icon: FileText, path: "/records" },
            { label: "랭킹", icon: Trophy, path: "/ranking" },
            { label: "엑셀 다운로드", icon: Download, path: "#", onClick: handleExcelDownload },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() => btn.onClick ? btn.onClick() : (btn.path !== "#" && navigate(btn.path))}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm transition-all ${
                btn.primary
                  ? "sf-gradient-btn text-white"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/[0.06]"
              }`}
            >
              <btn.icon className="h-4 w-4" />
              {btn.label}
            </button>
          ))}
        </div>

        {/* Recent 5 */}
        <SFCard>
          <p className="text-xs text-gray-500 mb-3">오늘 등록 최근 5건</p>
          {recentFive.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">등록된 내역이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {recentFive.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-sm text-white font-medium">{r.customer_name}</p>
                    <p className="text-[10px] text-gray-500">{r.phone}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm text-white font-medium">₩{r.sales_amount?.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">{r.final_quantity?.toFixed(1)} SOF</p>
                    </div>
                    <StatusBadge status={r.customer_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SFCard>

        {/* Dispatch Requests Section */}
        {dispatchRequests.length > 0 && (
          <SFCard>
            <p className="text-xs text-gray-500 mb-3">📤 파견 요청 현황 ({dispatchRequests.length})</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {dispatchRequests.map(req => {
                const isPending = req.status === "pending";
                const statusColor = req.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : req.status === "accepted" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400";
                const statusLabel = req.status === "pending" ? "대기" : req.status === "accepted" ? "수락" : "거절";
                return (
                  <div key={req.id} className="flex items-start justify-between gap-3 border-l-2 border-purple-500/30 pl-3 py-2.5 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{req.customer_name} ({req.customer_phone})</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">요청자: {req.caller_name}</p>
                      {req.memo && <p className="text-gray-600 text-[10px] mt-0.5 line-clamp-1">{req.memo}</p>}
                      <p className="text-gray-600 text-[10px] mt-0.5">{req.requested_at?.split("T")[0]}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap ${statusColor}`}>{statusLabel}</span>
                      {isPending && (
                        <>
                          <button onClick={() => updateDispatchStatus(req.id, "accepted")} disabled={updating === req.id}
                            className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30 disabled:opacity-50 transition-all">
                            <Check className="h-3 w-3" />
                          </button>
                          <button onClick={() => updateDispatchStatus(req.id, "rejected")} disabled={updating === req.id}
                            className="p-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 disabled:opacity-50 transition-all">
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SFCard>
        )}

        {/* 연결 대리점 현황 */}
        {(dealer?.position === '대리점지사장' || dealer?.position === '대리점장') && connectedDealers.length >= 0 && (() => {
          const thisMonth = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; })();
          const totalMonthSales = connectedSales.filter(s => (s.sale_date || '').startsWith(thisMonth)).reduce((a, s) => a + (s.sales_amount || 0), 0);
          return (
            <SFCard>
              <p className="text-xs text-gray-500 mb-3">🏢 연결 대리점 현황</p>
              {connectedDealers.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">연결된 대리점이 없습니다</p>
              ) : (
                <>
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                        {['대리점명','직책','이달매출','누적매출','상태'].map(h => (
                          <th key={h} className="text-left py-2 px-1.5 font-medium">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {connectedDealers.map(d => {
                          const dMonth = connectedSales.filter(s => s.dealer_name === d.dealer_name && (s.sale_date || '').startsWith(thisMonth)).reduce((a, s) => a + (s.sales_amount || 0), 0);
                          const dTotal = connectedSales.filter(s => s.dealer_name === d.dealer_name).reduce((a, s) => a + (s.sales_amount || 0), 0);
                          return (
                            <tr key={d.id} className="border-b border-white/[0.04] last:border-0">
                              <td className="py-2 px-1.5 text-white font-medium">{d.dealer_name}</td>
                              <td className="py-2 px-1.5 text-gray-400">{d.position || d.grade || '-'}</td>
                              <td className="py-2 px-1.5 text-emerald-400">₩{(dMonth/10000).toFixed(0)}만</td>
                              <td className="py-2 px-1.5 text-white">₩{(dTotal/10000).toFixed(0)}만</td>
                              <td className="py-2 px-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${d.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                  {d.status === 'active' ? '활성' : d.status === 'pending' ? '대기' : d.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                    <span className="text-gray-500">총 연결 <span className="text-white font-bold">{connectedDealers.length}</span>개 대리점</span>
                    <span className="text-gray-500">이달 합산 <span className="text-emerald-400 font-bold">₩{totalMonthSales.toLocaleString()}</span></span>
                  </div>
                </>
              )}
            </SFCard>
          );
        })()}

        {/* Orders Section */}
        {orders.length > 0 && (
          <SFCard>
            <p className="text-xs text-gray-500 mb-3">📦 나의 물량 처리 현황</p>
            <div className="space-y-2">
              {orders.slice(0, 10).map(o => {
                const st = o.status === "approved" ? { emoji: "🟢", label: "처리완료", color: "text-emerald-400" }
                  : o.status === "rejected" ? { emoji: "🔴", label: "반려", color: "text-red-400" }
                  : { emoji: "🟡", label: "처리중", color: "text-yellow-400" };
                return (
                  <div key={o.id} className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{o.customer_name}</p>
                      <p className="text-[10px] text-gray-500">{o.requested_at?.split("T")[0]} · ₩{(o.sales_amount||0).toLocaleString()} · {o.quantity?.toFixed(1)} SOF</p>
                      {o.status === "rejected" && o.admin_note && (
                        <p className="text-[10px] text-red-400 mt-0.5">반려 사유: {o.admin_note}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${st.color}`}>{st.emoji} {st.label}</span>
                  </div>
                );
              })}
            </div>
          </SFCard>
        )}
      </div>
    </div>
  );
}