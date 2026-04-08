import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import SFCard from "@/components/SFCard";
import { FileText, Send, Download, RefreshCw } from "lucide-react";
import { utils, writeFile } from "xlsx";

const BOT_TOKEN = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
const CHAT_ID = "5757341051";

function getLastMonth() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${y}-${String(m).padStart(2, "0")}`;
}

function getPrevMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}`;
}

export default function MonthlyReport() {
  const [reportMonth, setReportMonth] = useState(getLastMonth());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    document.title = "SolFort - 월간 리포트";
    loadLogs();
  }, []);

  useEffect(() => {
    loadStats();
  }, [reportMonth]);

  const loadLogs = async () => {
    const data = await base44.entities.MonthlyReportLog.list("-sent_at", 20);
    setLogs(data);
  };

  const loadStats = async () => {
    setLoading(true);
    setStats(null);
    try {
      const allRecords = await base44.entities.SalesRecord.list("-sale_date", 10000);
      const thisRecords = allRecords.filter(r => (r.sale_date || "").startsWith(reportMonth));
      const prevMonth = getPrevMonth(reportMonth);
      const prevRecords = allRecords.filter(r => (r.sale_date || "").startsWith(prevMonth));

      const totalSales = thisRecords.reduce((a, r) => a + (r.sales_amount || 0), 0);
      const prevTotal = prevRecords.reduce((a, r) => a + (r.sales_amount || 0), 0);
      const growthRate = prevTotal > 0 ? ((totalSales - prevTotal) / prevTotal * 100).toFixed(1) : null;

      // dealer top5
      const dealerMap = {};
      thisRecords.forEach(r => {
        if (!r.dealer_name) return;
        dealerMap[r.dealer_name] = (dealerMap[r.dealer_name] || 0) + (r.sales_amount || 0);
      });
      const dealerTop5 = Object.entries(dealerMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // call team top5 by assigned_to/created_by (call records don't have dealer = callteam member name)
      // We identify call records as those created_by a call team member
      const callMembers = await base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 500);
      const callUsernames = new Set(callMembers.map(m => m.username));
      const callMap = {};
      thisRecords.filter(r => callUsernames.has(r.created_by)).forEach(r => {
        const key = r.created_by;
        callMap[key] = (callMap[key] || 0) + (r.sales_amount || 0);
      });
      const callTop5 = Object.entries(callMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([username, sales]) => {
        const member = callMembers.find(m => m.username === username);
        return [member?.name || username, sales];
      });

      // best performer overall
      const allMap = { ...dealerMap };
      const bestDealer = dealerTop5[0] || null;

      setStats({ totalSales, prevTotal, growthRate, dealerTop5, callTop5, bestDealer, thisRecords, totalCount: thisRecords.length });
    } catch (e) {
      alert("데이터 로드 실패: " + e.message);
    }
    setLoading(false);
  };

  const buildMessage = () => {
    if (!stats) return "";
    const gr = stats.growthRate !== null ? `${stats.growthRate > 0 ? "+" : ""}${stats.growthRate}%` : "데이터없음";
    const dealer5 = stats.dealerTop5.map(([n, v], i) => `  ${i + 1}. ${n}: ₩${v.toLocaleString()}`).join("\n");
    const call5 = stats.callTop5.map(([n, v], i) => `  ${i + 1}. ${n}: ₩${v.toLocaleString()}`).join("\n");
    return `📊 [${reportMonth}] SolFort 월간 리포트\n\n` +
      `💰 총 매출: ₩${stats.totalSales.toLocaleString()}\n` +
      `📈 전월 대비: ${gr} (전월 ₩${stats.prevTotal.toLocaleString()})\n` +
      `📋 총 건수: ${stats.totalCount}건\n\n` +
      `🏪 대리점 TOP 5\n${dealer5 || "  데이터 없음"}\n\n` +
      `📞 콜팀 TOP 5\n${call5 || "  데이터 없음"}\n\n` +
      `🏆 최고 실적: ${stats.bestDealer ? `${stats.bestDealer[0]} (₩${stats.bestDealer[1].toLocaleString()})` : "-"}`;
  };

  const handleSendTelegram = async () => {
    if (!stats) return;
    setSending(true);
    const msg = buildMessage();
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: msg }),
      });
      await base44.entities.MonthlyReportLog.create({
        report_month: reportMonth,
        total_sales: stats.totalSales,
        sent_at: new Date().toISOString(),
        message_preview: msg.slice(0, 200),
      });
      await loadLogs();
      alert("텔레그램 발송 완료!");
    } catch (e) {
      alert("발송 실패: " + e.message);
    }
    setSending(false);
  };

  const handleExcelDownload = () => {
    if (!stats) return;
    const rows = stats.thisRecords.map(r => ({
      "날짜": r.sale_date || "",
      "대리점명": r.dealer_name || "",
      "고객명": r.customer_name || "",
      "연락처": r.phone || "",
      "매출금액": r.sales_amount || 0,
      "SOF수량": r.final_quantity || 0,
      "지갑주소": r.wallet_address || "",
      "고객구분": r.customer_status || "",
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, `${reportMonth}_매출`);
    writeFile(wb, `SolFort_${reportMonth}_월간리포트.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#080a12] p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-blue-400" />
        <h1 className="text-lg font-bold text-white">월간 리포트</h1>
      </div>

      {/* Month selector */}
      <SFCard>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 block mb-1">조회 월</label>
            <input
              type="month"
              value={reportMonth}
              onChange={e => setReportMonth(e.target.value)}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-full"
            />
          </div>
          <button onClick={loadStats} disabled={loading} className="mt-5 p-2 text-gray-400 hover:text-white transition-all">
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </SFCard>

      {/* Stats Card */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {stats && !loading && (
        <>
          <SFCard glow>
            <h2 className="text-sm font-bold text-white mb-4">📊 {reportMonth} 월간 현황</h2>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 mb-1">총 매출</p>
                <p className="text-base font-bold text-white">₩{(stats.totalSales / 10000).toFixed(0)}만</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 mb-1">전월 대비</p>
                <p className={`text-base font-bold ${stats.growthRate === null ? "text-gray-400" : stats.growthRate >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {stats.growthRate !== null ? `${stats.growthRate > 0 ? "+" : ""}${stats.growthRate}%` : "-"}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 mb-1">총 건수</p>
                <p className="text-base font-bold text-blue-400">{stats.totalCount}건</p>
              </div>
            </div>

            {/* Dealer Top 5 */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">🏪 대리점 TOP 5</h3>
              {stats.dealerTop5.length === 0 ? (
                <p className="text-xs text-gray-600">데이터 없음</p>
              ) : stats.dealerTop5.map(([name, sales], i) => (
                <div key={name} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                  <span className="flex-1 text-xs text-white">{name}</span>
                  <span className="text-xs font-bold text-yellow-400">₩{sales.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Call Top 5 */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">📞 콜팀 TOP 5</h3>
              {stats.callTop5.length === 0 ? (
                <p className="text-xs text-gray-600">데이터 없음</p>
              ) : stats.callTop5.map(([name, sales], i) => (
                <div key={name} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                  <span className="flex-1 text-xs text-white">{name}</span>
                  <span className="text-xs font-bold text-purple-400">₩{sales.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Best Performer */}
            {stats.bestDealer && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-xs text-yellow-400 font-semibold">🏆 이달의 최고 실적</p>
                <p className="text-sm text-white font-bold mt-1">{stats.bestDealer[0]}</p>
                <p className="text-xs text-yellow-300">₩{stats.bestDealer[1].toLocaleString()}</p>
              </div>
            )}
          </SFCard>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSendTelegram}
              disabled={sending}
              className="flex items-center justify-center gap-2 py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 transition-all"
            >
              <Send className="h-4 w-4" />
              {sending ? "발송 중..." : "텔레그램 발송"}
            </button>
            <button
              onClick={handleExcelDownload}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all"
            >
              <Download className="h-4 w-4" />
              엑셀 다운로드
            </button>
          </div>
        </>
      )}

      {/* Past Report Logs */}
      <SFCard>
        <h2 className="text-sm font-bold text-white mb-3">📋 발송 이력</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">발송 이력이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-xs text-white font-medium">{log.report_month} 리포트</p>
                  <p className="text-[10px] text-gray-500">{(log.sent_at || "").replace("T", " ").substring(0, 16)}</p>
                </div>
                <p className="text-xs font-bold text-yellow-400">₩{(log.total_sales || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </SFCard>
    </div>
  );
}