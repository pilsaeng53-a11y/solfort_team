import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { Auth } from "@/api/neonClient";
import SFCard from "./SFCard";

const STATUS_MAP = {
  pending: { label: "처리중", emoji: "🟡", bg: "bg-yellow-500/20", text: "text-yellow-400" },
  approved: { label: "처리완료", emoji: "🟢", bg: "bg-emerald-500/20", text: "text-emerald-400" },
  rejected: { label: "반려", emoji: "🔴", bg: "bg-red-500/20", text: "text-red-400" },
};

export default function SalesOrderPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const isSuperAdmin = Auth.isSuperAdmin();

  useEffect(() => {
    base44.entities.SalesOrder.list("-created_date", 500).then(setOrders).finally(() => setLoading(false));
  }, []);

  const processOrder = async (order, status, note = "") => {
    setProcessing(order.id);
    const data = {
      status,
      processed_at: new Date().toISOString(),
      processed_by: localStorage.getItem("sf_user_id") || "admin",
      ...(note ? { admin_note: note } : {}),
    };
    await base44.entities.SalesOrder.update(order.id, data);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...data } : o));
    setProcessing(null);
    setRejectModal(null);
    setRejectNote("");
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.dealer_name?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q);
    const matchStatus = o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[["pending", "대기"], ["approved", "처리완료"], ["rejected", "반려"]].map(([v, l]) => {
          const count = orders.filter(o => o.status === v).length;
          return (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
              {STATUS_MAP[v].emoji} {l}
              {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-gray-500"}`}>{count}</span>}
            </button>
          );
        })}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
          className="ml-auto bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 w-48" />
      </div>

      {pendingCount > 0 && statusFilter !== "pending" && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-xs text-yellow-400">
          ⚠️ 처리 대기 중인 물량 신청이 {pendingCount}건 있습니다
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["신청일", "대리점명", "고객명", "매출", "수량", "상태", ...(isSuperAdmin ? ["처리"] : [])].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(o => {
              const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
              return (
                <tr key={o.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-gray-500">{o.requested_at?.split("T")[0]}</td>
                  <td className="py-3 px-2 text-white font-medium">{o.dealer_name}</td>
                  <td className="py-3 px-2 text-gray-300">{o.customer_name}</td>
                  <td className="py-3 px-2 text-white">₩{(o.sales_amount || 0).toLocaleString()}</td>
                  <td className="py-3 px-2 text-blue-400">{o.quantity?.toFixed(1)} SOF</td>
                  <td className="py-3 px-2">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>{st.emoji} {st.label}</span>
                      {o.status === "rejected" && o.admin_note && (
                        <p className="text-[10px] text-red-400 mt-0.5 max-w-[160px]">{o.admin_note}</p>
                      )}
                    </div>
                  </td>
                  {isSuperAdmin && (
                    <td className="py-3 px-2">
                      {o.status === "pending" && (
                        <div className="flex gap-1">
                          <button onClick={() => processOrder(o, "approved")} disabled={processing === o.id}
                            className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                            ✅ 완료
                          </button>
                          <button onClick={() => setRejectModal(o)} disabled={processing === o.id}
                            className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">
                            ❌ 반려
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-gray-600">해당 건이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setRejectModal(null); setRejectNote(""); }} />
          <div className="relative bg-[#0d0f1a] border border-white/[0.08] rounded-2xl p-5 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-white mb-3">반려 사유 입력</h3>
            <p className="text-xs text-gray-500 mb-3">{rejectModal.dealer_name} · {rejectModal.customer_name}</p>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="반려 사유를 입력하세요"
              rows={3} className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs resize-none placeholder:text-gray-600 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => processOrder(rejectModal, "rejected", rejectNote)}
                className="flex-1 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs hover:bg-red-500/30">
                반려 확정
              </button>
              <button onClick={() => { setRejectModal(null); setRejectNote(""); }}
                className="flex-1 py-2.5 bg-white/5 text-gray-400 rounded-xl text-xs hover:bg-white/10">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}