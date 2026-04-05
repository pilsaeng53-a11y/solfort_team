import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";

const LOG_TYPES = [
  ["all", "전체"],
  ["login", "로그인"],
  ["grade_change", "등급변경"],
  ["price_change", "단가변경"],
  ["telegram_send", "텔레그램"],
  ["sales_delete", "매출삭제"],
  ["approval", "승인처리"],
];

const TYPE_BADGE = {
  login: "bg-blue-500/20 text-blue-400",
  grade_change: "bg-yellow-500/20 text-yellow-400",
  price_change: "bg-purple-500/20 text-purple-400",
  telegram_send: "bg-emerald-500/20 text-emerald-400",
  sales_delete: "bg-red-500/20 text-red-400",
  approval: "bg-blue-500/20 text-blue-400",
};

const TYPE_LABELS = {
  login: "로그인",
  grade_change: "등급변경",
  price_change: "단가변경",
  telegram_send: "텔레그램",
  sales_delete: "매출삭제",
  approval: "승인처리",
};

const today = new Date().toISOString().split("T")[0];
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

const PAGE_SIZE = 50;

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}

export default function SystemLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateMode, setDateMode] = useState("month"); // today | week | month | custom
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [page, setPage] = useState(0);

  useEffect(() => {
    base44.entities.SystemLog.list("-created_at", 2000).then(setLogs).finally(() => setLoading(false));
  }, []);

  const getRange = () => {
    if (dateMode === "today") return [today, today];
    if (dateMode === "week") return [weekAgo, today];
    if (dateMode === "month") return [monthStart, today];
    return [startDate, endDate];
  };

  const [rangeStart, rangeEnd] = getRange();

  const filtered = logs.filter(l => {
    const d = (l.created_at || "").split("T")[0];
    const inRange = d >= rangeStart && d <= rangeEnd;
    const matchType = typeFilter === "all" || l.log_type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || l.actor?.toLowerCase().includes(q) || l.target?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q);
    return inRange && matchType && matchSearch;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      {/* Type filter */}
      <div className="flex overflow-x-auto gap-1 pb-1">
        {LOG_TYPES.map(([v, l]) => (
          <button key={v} onClick={() => { setTypeFilter(v); setPage(0); }}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Date + search */}
      <div className="flex gap-2 flex-wrap items-center">
        {[["today", "오늘"], ["week", "이번주"], ["month", "이번달"], ["custom", "직접입력"]].map(([v, l]) => (
          <button key={v} onClick={() => { setDateMode(v); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${dateMode === v ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-gray-500"}`}>
            {l}
          </button>
        ))}
        {dateMode === "custom" && (
          <>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs" />
            <span className="text-gray-600 text-xs">~</span>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs" />
          </>
        )}
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="수행자 / 대상 검색..."
          className="ml-auto bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs placeholder:text-gray-600 w-48" />
      </div>

      <p className="text-xs text-gray-600">{filtered.length}건 조회됨</p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-white/[0.06]">
              {["일시", "유형", "수행자", "역할", "대상", "내용", "변경전", "변경후"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-600">로그 없음</td></tr>
            ) : paged.map((l, i) => (
              <tr key={l.id || i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{l.created_at?.replace("T", " ").substring(0, 16)}</td>
                <td className="py-2.5 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${TYPE_BADGE[l.log_type] || "bg-white/10 text-gray-400"}`}>
                    {TYPE_LABELS[l.log_type] || l.log_type}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-white">{l.actor}</td>
                <td className="py-2.5 px-2 text-gray-500">{l.actor_role}</td>
                <td className="py-2.5 px-2 text-gray-300 max-w-[120px] truncate">{l.target}</td>
                <td className="py-2.5 px-2 text-gray-400 max-w-[150px] truncate">{l.action}</td>
                <td className="py-2.5 px-2 text-gray-600 max-w-[80px] truncate">{l.before_value || "-"}</td>
                <td className="py-2.5 px-2 text-emerald-400 max-w-[80px] truncate">{l.after_value || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs disabled:opacity-30">← 이전</button>
          <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs disabled:opacity-30">다음 →</button>
        </div>
      )}
    </div>
  );
}