import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";

const BOT_TOKEN = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default function TelegramBot() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const lastUpdateId = useRef(0);
  const timerRef = useRef(null);
  const logsEndRef = useRef(null);

  const addLog = (type, text, detail) => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString("ko-KR"),
      type,
      text,
      detail,
    }, ...prev].slice(0, 200));
  };

  const parseAndSave = async (msgText, from) => {
    // Format 3: 이름:X 별점:N 평가:Y (satisfaction review)
    if (msgText.includes("이름:") && msgText.includes("별점:")) {
      try {
        const nameMatch = msgText.match(/이름:\s*([^\n별]+)/);
        const ratingMatch = msgText.match(/별점:\s*(\d)/);
        const reviewMatch = msgText.match(/평가:\s*([^\n]*)/);
        
        if (nameMatch && ratingMatch) {
          const customer_name = nameMatch[1].trim();
          const rating = parseInt(ratingMatch[1]);
          const review_text = reviewMatch ? reviewMatch[1].trim() : "";
          
          await base44.entities.CustomerReview.create({
            customer_name,
            rating,
            review_text,
            staff_name: from,
            reviewed_at: new Date().toISOString(),
          });
          addLog("review", `평가 등록: ${customer_name} / ${rating}⭐`, `from: ${from}`);
          return;
        }
      } catch (e) {
        addLog("error", `평가 파싱 오류: ${e.message}`, `from: ${from}`);
        return;
      }
    }
    
    const parts = msgText.trim().split("/");
    if (parts.length === 3) {
      const [customer_name, phone, amountStr] = parts;
      const amount = Number(amountStr.replace(/[^0-9]/g, ""));
      await base44.entities.SalesRecord.create({
        customer_name: customer_name.trim(),
        phone: phone.trim(),
        sales_amount: amount,
        registered_via: "telegram",
        registered_at: new Date().toISOString(),
        sale_date: new Date().toISOString().split("T")[0],
      });
      addLog("sales", `매출 등록: ${customer_name.trim()} / ${phone.trim()} / ₩${amount.toLocaleString()}`, `from: ${from}`);
    } else if (parts.length === 4) {
      const [name, phone, status, amountStr] = parts;
      const statusMap = { "수락": "수락", "거절": "거절", "가망": "가망" };
      const mappedStatus = statusMap[status.trim()] || status.trim();
      const amount = Number(amountStr.replace(/[^0-9]/g, ""));
      await base44.entities.CallLead.create({
        name: name.trim(),
        phone: phone.trim(),
        status: mappedStatus,
        interest_amount: amount,
        source: "telegram",
        created_at: new Date().toISOString(),
      });
      addLog("lead", `리드 등록: ${name.trim()} / ${phone.trim()} / ${mappedStatus} / ₩${amount.toLocaleString()}`, `from: ${from}`);
    } else {
      addLog("unknown", `인식 불가 형식: ${msgText}`, `from: ${from}`);
    }
  };

  const poll = async () => {
    try {
      const res = await fetch(
        `${API}/getUpdates?offset=${lastUpdateId.current + 1}&timeout=5`
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      setConnected(true);
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId.current = update.update_id;
          const msg = update.message;
          if (msg && msg.text) {
            const from = msg.from?.username || msg.from?.first_name || "unknown";
            await parseAndSave(msg.text, from);
          }
        }
      }
    } catch (e) {
      setConnected(false);
      addLog("error", "폴링 오류: " + e.message, "");
    }
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, 10000);
    return () => clearInterval(timerRef.current);
  }, []);

  const LOG_STYLES = {
    sales: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "매출" },
    lead: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", label: "리드" },
    review: { bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-400", label: "평가" },
    unknown: { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", label: "미인식" },
    error: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "오류" },
  };

  return (
    <div className="min-h-screen bg-[#080a12] p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">📨 텔레그램 봇 수신</h1>
          <p className="text-xs text-gray-500 mt-0.5">10초마다 메시지 수신 · 자동 등록</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${connected ? "text-emerald-400" : "text-red-400"}`}>
            {connected ? "🟢 연결중" : "🔴 연결끊김"}
          </span>
        </div>
      </div>

      {/* Format Guide */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 space-y-2">
        <p className="text-xs font-semibold text-gray-400 mb-2">📋 메시지 형식</p>
        <div className="flex items-start gap-2">
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono shrink-0">매출</span>
          <p className="text-xs text-gray-300 font-mono">이름/연락처/금액</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono shrink-0">리드</span>
          <p className="text-xs text-gray-300 font-mono">이름/연락처/수락|거절|가망/금액</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-mono shrink-0">평가</span>
          <p className="text-xs text-gray-300 font-mono">이름:X 별점:N 평가:Y</p>
        </div>
      </div>

      {/* Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 font-semibold">수신 로그 ({logs.length}건)</p>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">메시지 대기 중...</div>
        ) : (
          logs.map(log => {
            const s = LOG_STYLES[log.type] || LOG_STYLES.unknown;
            return (
              <div key={log.id} className={`border rounded-xl px-4 py-3 ${s.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.text} bg-white/5`}>{s.label}</span>
                  <span className="text-[10px] text-gray-500">{log.time}</span>
                  {log.detail && <span className="text-[10px] text-gray-600 ml-auto">{log.detail}</span>}
                </div>
                <p className={`text-xs font-medium ${s.text}`}>{log.text}</p>
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}