import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const API = "https://solfort-api-9red.onrender.com";
const BOT_TOKEN = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const h = () => ({ "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("sf_token") });

const LOG_STYLES = {
  call_sales:   { bg: "bg-emerald-500/20 border-emerald-500/30", text: "text-emerald-400", label: "🟢 콜매출" },
  call_lead:    { bg: "bg-blue-500/20 border-blue-500/30",       text: "text-blue-400",    label: "🔵 콜리드" },
  dealer_sales: { bg: "bg-amber-500/20 border-amber-500/30",     text: "text-amber-400",   label: "🟡 대리점" },
  review:       { bg: "bg-purple-500/20 border-purple-500/30",   text: "text-purple-400",  label: "🟣 만족도" },
  error:        { bg: "bg-red-500/20 border-red-500/30",         text: "text-red-400",     label: "🔴 오류" },
};

export default function TelegramBot() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const offsetRef = useRef(0);

  const addLog = (type, text, raw = "") => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      type,
      text,
      raw,
      time: new Date().toLocaleTimeString("ko-KR"),
      ts: new Date().toISOString(),
    }, ...prev].slice(0, 300));
  };

  const parseAndSave = async (text, from) => {
    // 만족도 체크 먼저
    if (text.includes("이름:") && text.includes("별점:")) {
      const nameM = text.match(/이름:\s*([^\s별]+)/);
      const ratingM = text.match(/별점:\s*(\d)/);
      const reviewM = text.match(/평가:\s*(.+)/);
      if (nameM && ratingM) {
        const payload = {
          customer_name: nameM[1].trim(),
          rating: parseInt(ratingM[1]),
          review: reviewM ? reviewM[1].trim() : "",
          source: "telegram",
        };
        try {
          await fetch(`${API}/api/reviews`, { method: "POST", headers: h(), body: JSON.stringify(payload) });
          addLog("review", `${payload.customer_name} / ${payload.rating}⭐ / ${payload.review}`, text);
        } catch (e) {
          addLog("error", `만족도 저장 실패: ${e.message}`, text);
        }
      } else {
        addLog("error", "만족도 파싱 실패: " + text, text);
      }
      return;
    }

    const parts = text.trim().split("/").map(p => p.trim());

    if (parts.length === 5) {
      const [n, ph, amt, wallet, emp] = parts;
      const payload = {
        customer_name: n,
        phone: ph,
        amount: Number(amt.replace(/[^0-9]/g, "")),
        wallet_address: wallet,
        caller_name: emp,
        from_call_team: emp,
        source: "telegram_call",
      };
      try {
        await fetch(`${API}/api/sales`, { method: "POST", headers: h(), body: JSON.stringify(payload) });
        addLog("call_sales", `${n} / ${ph} / ₩${payload.amount.toLocaleString()} / ${wallet} / ${emp}`, text);
      } catch (e) {
        addLog("error", `콜매출 저장 실패: ${e.message}`, text);
      }

    } else if (parts.length === 4) {
      const [n, ph, memo, emp] = parts;
      const payload = {
        name: n,
        phone: ph,
        memo: memo,
        status: "가망",
        caller_name: emp,
        source: "telegram_call",
      };
      try {
        await fetch(`${API}/api/leads`, { method: "POST", headers: h(), body: JSON.stringify(payload) });
        addLog("call_lead", `${n} / ${ph} / ${memo} / ${emp}`, text);
      } catch (e) {
        addLog("error", `콜리드 저장 실패: ${e.message}`, text);
      }

    } else if (parts.length === 3) {
      const [n, ph, amt] = parts;
      const payload = {
        customer_name: n,
        phone: ph,
        amount: Number(amt.replace(/[^0-9]/g, "")),
        dealer_name: from,
        source: "telegram_dealer",
      };
      try {
        await fetch(`${API}/api/sales`, { method: "POST", headers: h(), body: JSON.stringify(payload) });
        addLog("dealer_sales", `${n} / ${ph} / ₩${payload.amount.toLocaleString()} / from:${from}`, text);
      } catch (e) {
        addLog("error", `대리점 저장 실패: ${e.message}`, text);
      }

    } else {
      addLog("error", `인식 불가 (${parts.length}파트): ${text}`, text);
    }
  };

  const poll = async () => {
    try {
      const res = await fetch(`${TG_API}/getUpdates?offset=${offsetRef.current + 1}&timeout=5`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data.ok) throw new Error(data.description || "Telegram error");
      setConnected(true);
      for (const update of data.result) {
        offsetRef.current = update.update_id;
        const msg = update.message;
        if (msg?.text) {
          const from = msg.from?.username || msg.from?.first_name || "unknown";
          await parseAndSave(msg.text, from);
        }
      }
    } catch (e) {
      setConnected(false);
    }
  };

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  const styleCell = (ws, addr, bgRgb, fontRgb, bold) => {
    if (!ws[addr]) ws[addr] = { t: "s", v: "" };
    ws[addr].s = {
      fill: { patternType: "solid", fgColor: { rgb: bgRgb } },
      font: { color: { rgb: fontRgb }, bold: !!bold },
    };
  };

  const handleExcelDownload = async () => {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");

    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().split("T")[0];

    const buildSheet = (headers, rows, headerBg, dataBg) => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      headers.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
        styleCell(ws, addr, headerBg, "FFFFFF", true);
      });
      rows.forEach((row, ri) => {
        row.forEach((_, ci) => {
          const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
          styleCell(ws, addr, dataBg, "000000", false);
        });
      });
      return ws;
    };

    // 콜매출
    const callSalesRows = logs.filter(l => l.type === "call_sales").map(l => {
      const p = l.raw.split("/").map(s => s.trim());
      return [p[0]||"", p[1]||"", Number((p[2]||"0").replace(/[^0-9]/g,"")), p[3]||"", p[4]||"", l.time];
    });
    XLSX.utils.book_append_sheet(wb, buildSheet(["고객이름","연락처","매출금액","지갑주소","직원코드","수신시간"], callSalesRows, "10b981", "d1fae5"), "콜매출");

    // 콜리드
    const callLeadRows = logs.filter(l => l.type === "call_lead").map(l => {
      const p = l.raw.split("/").map(s => s.trim());
      return [p[0]||"", p[1]||"", p[2]||"", p[3]||"", l.time];
    });
    XLSX.utils.book_append_sheet(wb, buildSheet(["고객이름","연락처","비고","직원코드","수신시간"], callLeadRows, "3b82f6", "dbeafe"), "콜리드");

    // 대리점매출
    const dealerRows = logs.filter(l => l.type === "dealer_sales").map(l => {
      const p = l.raw.split("/").map(s => s.trim());
      return [p[0]||"", p[1]||"", Number((p[2]||"0").replace(/[^0-9]/g,"")), l.text.match(/from:(\S+)/)?.[1]||"", l.time];
    });
    XLSX.utils.book_append_sheet(wb, buildSheet(["고객이름","연락처","매출금액","발신자","수신시간"], dealerRows, "f59e0b", "fef3c7"), "대리점매출");

    // 만족도
    const reviewRows = logs.filter(l => l.type === "review").map(l => {
      const p = l.text.split(" / ");
      return [p[0]||"", p[1]?.replace("⭐","")||"", p[2]||"", l.time];
    });
    XLSX.utils.book_append_sheet(wb, buildSheet(["고객명","별점","평가내용","수신시간"], reviewRows, "8b5cf6", "ede9fe"), "만족도");

    XLSX.writeFile(wb, `SolFort_텔레그램_${today}.xlsx`);
    toast.success("엑셀 다운로드 완료");
  };

  const counts = {
    call_sales: logs.filter(l => l.type === "call_sales").length,
    call_lead: logs.filter(l => l.type === "call_lead").length,
    dealer_sales: logs.filter(l => l.type === "dealer_sales").length,
    review: logs.filter(l => l.type === "review").length,
  };

  return (
    <div className="min-h-screen bg-[#080a12] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080a12]/95 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-base font-bold text-white">📨 텔레그램 봇 수신</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">10초마다 자동 폴링</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-xs font-medium ${connected ? "text-emerald-400" : "text-red-400"}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {connected ? "연결중" : "끊김"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Format Guide */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">📋 메시지 입력 형식</p>
          <div className="space-y-2">
            {[
              { style: LOG_STYLES.call_sales,   desc: "이름/연락처/금액/지갑주소/직원코드",  note: "(5개)" },
              { style: LOG_STYLES.call_lead,    desc: "이름/연락처/비고/직원코드",           note: "(4개)" },
              { style: LOG_STYLES.dealer_sales, desc: "이름/연락처/금액",                    note: "(3개)" },
              { style: LOG_STYLES.review,       desc: "이름:X 별점:N 평가:Y",              note: "" },
            ].map(({ style, desc, note }) => (
              <div key={style.label} className="flex items-center gap-2">
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${style.bg} ${style.text}`}>{style.label}</span>
                <code className="text-[11px] text-gray-300">{desc}</code>
                {note && <span className="text-[10px] text-gray-600">{note}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Stats + Download */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { type: "call_sales",   count: counts.call_sales,   color: "text-emerald-400 border-emerald-500/30", label: "콜매출" },
            { type: "call_lead",    count: counts.call_lead,    color: "text-blue-400 border-blue-500/30",       label: "콜리드" },
            { type: "dealer_sales", count: counts.dealer_sales, color: "text-amber-400 border-amber-500/30",     label: "대리점" },
            { type: "review",       count: counts.review,       color: "text-purple-400 border-purple-500/30",   label: "만족도" },
          ].map(c => (
            <div key={c.type} className={`rounded-xl border p-3 text-center ${c.color} bg-white/[0.02]`}>
              <p className="text-lg font-bold">{c.count}</p>
              <p className="text-[10px] mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleExcelDownload}
          className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl text-sm font-semibold transition-all"
        >
          📊 엑셀 다운로드
        </button>

        {/* Log List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">수신 로그 ({logs.length}건)</p>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">초기화</button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-20 text-gray-600 text-sm">대기 중...</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const s = LOG_STYLES[log.type] || LOG_STYLES.error;
                return (
                  <div key={log.id} className={`border rounded-xl px-3 py-2.5 ${s.bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                      <span className="text-[10px] text-gray-600">{log.time}</span>
                    </div>
                    <p className={`text-xs ${s.text} font-medium`}>{log.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}