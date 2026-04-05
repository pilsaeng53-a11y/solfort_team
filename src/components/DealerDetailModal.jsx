import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import StatusBadge from "./StatusBadge";
import GradeBadge from "./GradeBadge";

export default function DealerDetailModal({ dealer, onClose }) {
  const [tab, setTab] = useState(0);
  const [sales, setSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [processing, setProcessing] = useState(null);
  const [search, setSearch] = useState("");
  const isSuperAdmin = Auth.isSuperAdmin();

  useEffect(() => {
    if (!dealer) return;
    setLoading(true);
    Promise.all([
      base44.entities.SalesRecord.list("-created_date", 1000),
      base44.entities.SalesOrder.list("-created_date", 500),
    ]).then(([s, o]) => {
      setSales(s.filter(r => r.dealer_name === dealer.dealer_name));
      setOrders(o.filter(r => r.dealer_name === dealer.dealer_name));
      setLoading(false);
    });
  }, [dealer]);

  const processOrder = async (order, status, note = "") => {
    setProcessing(order.id);
    const data = { status, processed_at: new Date().toISOString(), processed_by: localStorage.getItem("sf_user_id") || "admin" };
    if (note) data.admin_note = note;
    await base44.entities.SalesOrder.update(order.id, data);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...data } : o));
    setProcessing(null);
    setRejectModal(null);
    setRejectNote("");
  };

  if (!dealer) return null;

  const totalSales = sales.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const filtered = sales.filter(r => {
    const q = search.toLowerCase();
    return !q || r.customer_name?.toLowerCase().includes(q) || r.phone?.includes(q);
  });

  const ORDER_STATUS = {
    pending: { label: "처리중", emoji: "🟡", bg: "bg-yellow-500/20", text: "text-yellow-400" },
    approved: { label: "처리완료", emoji: "🟢", bg: "bg-emerald-500/20", text: "text-emerald-400" },
    rejected: { label: "반려", emoji: "🔴", bg: "bg-red-500/20", text: "text-red-400" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d0f1a] border border-white/[0.08] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">{dealer.dealer_name}</h2>
              <p className="text-xs text-gray-500">{dealer.owner_name} · {dealer.phone}</p>
            </div>
            <GradeBadge grade={dealer.grade || "GREEN"} />
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {["매출 내역", "물량 처리 현황"].map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
              {t}
              {i === 1 && orders.filter(o => o.status === "pending").length > 0 && (
                <span className="ml-1.5 bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                  {orders.filter(o => o.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
          ) : tab === 0 ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  ["총매출", `₩${totalSales.toLocaleString()}`],
                  ["건수", `${sales.length}건`],
                  ["신규", `${sales.filter(r => r.customer_status === "new").length}`],
                  ["기존", `${sales.filter(r => r.customer_status === "existing").length}`],
                ].map(([l, v]) => (
                  <div key={l} className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-500">{l}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                    {["날짜", "고객명", "연락처", "매출", "SOF", "상태"].map(h => (
                      <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-2 px-2 text-gray-500">{r.sale_date}</td>
                        <td className="py-2 px-2 text-white">{r.customer_name}</td>
                        <td className="py-2 px-2 text-gray-400">{r.phone}</td>
                        <td className="py-2 px-2 text-white">₩{(r.sales_amount || 0).toLocaleString()}</td>
                        <td className="py-2 px-2 text-blue-400">{r.final_quantity?.toFixed(1)}</td>
                        <td className="py-2 px-2"><StatusBadge status={r.customer_status} /></td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-xs text-gray-600">매출 내역 없음</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                    {["신청일", "고객명", "매출", "수량", "상태", ...(isSuperAdmin ? ["처리"] : [])].map(h => (
                      <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {orders.map(o => {
                      const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
                      return (
                        <tr key={o.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="py-2.5 px-2 text-gray-500">{o.requested_at?.split("T")[0]}</td>
                          <td className="py-2.5 px-2 text-white">{o.customer_name}</td>
                          <td className="py-2.5 px-2 text-white">₩{(o.sales_amount || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-blue-400">{o.quantity?.toFixed(1)}</td>
                          <td className="py-2.5 px-2">
                            <div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>{st.emoji} {st.label}</span>
                              {o.status === "rejected" && o.admin_note && (
                                <p className="text-[10px] text-red-400 mt-0.5">{o.admin_note}</p>
                              )}
                            </div>
                          </td>
                          {isSuperAdmin && (
                            <td className="py-2.5 px-2">
                              {o.status === "pending" && (
                                <div className="flex gap-1">
                                  <button onClick={() => processOrder(o, "approved")} disabled={processing === o.id}
                                    className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                                    ✅ 처리완료
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
                    {orders.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-xs text-gray-600">물량 처리 신청 없음</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="absolute inset-0 z-60 flex items-center justify-center p-4">
          <div className="bg-[#0d0f1a] border border-white/[0.08] rounded-2xl p-5 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-white mb-3">반려 사유 입력</h3>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="반려 사유를 입력하세요"
              rows={3} className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs resize-none placeholder:text-gray-600 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => processOrder(rejectModal, "rejected", rejectNote)}
                className="flex-1 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs hover:bg-red-500/30">
                반려 확정
              </button>
              <button onClick={() => { setRejectModal(null); setRejectNote(""); }}
                className="flex-1 py-2 bg-white/5 text-gray-400 rounded-xl text-xs hover:bg-white/10">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}