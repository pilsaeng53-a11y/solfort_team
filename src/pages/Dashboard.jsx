import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
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

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.SalesRecord.list("-created_date", 500);
      setRecords(all);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
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
    if (dealer?.dealer_name) {
      Promise.all([
        base44.entities.SalesOrder.list("-created_date", 100),
        base44.entities.MeetingDispatchRequest.filter({ target_dealer_name: dealer.dealer_name }, "-requested_at", 50),
      ])
        .then(([allOrders, reqs]) => {
          setOrders(allOrders.filter(o => o.dealer_name === dealer.dealer_name));
          setDispatchRequests(reqs);
        })
        .catch(() => {
          setOrders([]);
          setDispatchRequests([]);
        });
    }
  }, [dealer]);

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
      await base44.entities.MeetingDispatchRequest.update(id, { status: newStatus });
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