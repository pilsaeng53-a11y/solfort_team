import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import SFCard from "./SFCard";

const ACTION_COLOR = {
  "승인": "bg-emerald-500/20 text-emerald-400",
  "퇴출": "bg-red-500/20 text-red-400",
  "등급변경": "bg-blue-500/20 text-blue-400",
};

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}

export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.AuditLog.list("-created_at", 500)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(log => {
    const roleMatch = roleFilter === "all" || log.actor_role === roleFilter;
    const actionMatch = actionFilter === "all" || log.action === actionFilter;
    const q = search.toLowerCase();
    const searchMatch = !q || log.actor?.toLowerCase().includes(q) || log.target_name?.toLowerCase().includes(q) || log.detail?.toLowerCase().includes(q);
    return roleMatch && actionMatch && searchMatch;
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex gap-1">
          {["all", "admin", "dealer", "call_team"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${roleFilter === r ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
              {r === "all" ? "모든 역할" : r === "admin" ? "관리자" : r === "dealer" ? "대리점" : "콜팀"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {["all", "승인", "퇴출", "등급변경"].map(a => (
            <button key={a} onClick={() => setActionFilter(a)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${actionFilter === a ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
              {a === "all" ? "모든 액션" : a}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
          className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
      </div>

      {/* 로그 테이블 */}
      <SFCard>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["시각", "사용자", "역할", "액션", "대상", "상세내용"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-xs text-gray-600">감사 로그가 없습니다</td></tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{log.created_at?.substring(0, 19).replace("T", " ")}</td>
                    <td className="py-3 px-2 text-white font-medium">{log.actor}</td>
                    <td className="py-3 px-2 text-gray-400 text-[10px]">{log.actor_role}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ACTION_COLOR[log.action] || "bg-gray-500/20 text-gray-400"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-300">{log.target_name}</td>
                    <td className="py-3 px-2 text-gray-400 max-w-xs truncate">{log.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SFCard>
    </div>
  );
}