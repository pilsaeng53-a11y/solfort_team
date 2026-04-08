import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { Auth } from "@/api/neonClient";
import OnlineNav from "../components/OnlineNav";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { utils, writeFile } from "xlsx";

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

export default function OnlinePerformance() {
  const username = Auth.getDealerName() || localStorage.getItem("sf_dealer_name") || "";
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  useEffect(() => {
    base44.entities.SalesRecord.list("-sale_date", 2000)
      .then(data => setRecords(data.filter(r => r.registered_by_online === username)))
      .finally(() => setLoading(false));
  }, [username]);

  // Monthly chart data (last 6 months)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    const monthRecs = records.filter(r => (r.sale_date || "").startsWith(ym));
    return { label, ym, count: monthRecs.length, revenue: monthRecs.reduce((a, r) => a + (r.sales_amount || 0), 0) };
  });

  const filtered = records.filter(r => (r.sale_date || "").startsWith(selectedMonth));
  const totalRevenue = filtered.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const avgRevenue = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }).reverse();

  const handleExport = () => {
    const rows = filtered.map(r => ({
      "날짜": r.sale_date || "",
      "고객명": r.customer_name || "",
      "연락처": r.phone || "",
      "매출금액": r.sales_amount || 0,
      "연결대리점": r.dealer_name || "",
      "연결콜팀": r.call_member || "",
      "상태": r.customer_status || "",
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "실적");
    writeFile(wb, `온라인팀_실적_${selectedMonth}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080a12] border-b border-white/[0.06] px-5 py-4">
        <h1 className="text-base font-bold text-emerald-400">실적 현황</h1>
        <p className="text-[10px] text-gray-500">{username}</p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {loading ? <Loader /> : (
          <>
            {/* Bar Chart */}
            <div className="bg-[#0d1117] border border-white/[0.06] rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 mb-3">월별 DB 등록 수</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(v) => [`${v}건`, "DB수"]}
                  />
                  <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Month Filter + Export */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
              >
                {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all whitespace-nowrap"
              >
                📥 엑셀 다운
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "총 DB수", value: `${filtered.length}건`, color: "text-emerald-400" },
                { label: "총 매출기여", value: `₩${(totalRevenue / 10000).toFixed(0)}만`, color: "text-yellow-400" },
                { label: "평균 매출", value: `₩${(avgRevenue / 10000).toFixed(1)}만`, color: "text-blue-400" },
              ].map(c => (
                <div key={c.label} className="bg-[#0d1a12] border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-[9px] text-gray-500 mb-1">{c.label}</p>
                  <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-3">등록 DB 목록 ({filtered.length}건)</p>
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-6">해당 월 데이터가 없습니다</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/[0.06]">
                        {["날짜", "고객명", "연락처", "매출", "연결대리점", "연결콜팀", "상태"].map(h => (
                          <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(r => (
                        <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{r.sale_date}</td>
                          <td className="py-2.5 px-2 text-white font-medium">{r.customer_name}</td>
                          <td className="py-2.5 px-2 text-gray-400">{r.phone}</td>
                          <td className="py-2.5 px-2 text-emerald-400 whitespace-nowrap">₩{(r.sales_amount || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-gray-400">{r.dealer_name || "-"}</td>
                          <td className="py-2.5 px-2 text-gray-400">{r.call_member || "-"}</td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              r.customer_status === "new" ? "bg-yellow-500/20 text-yellow-400"
                              : r.customer_status === "existing" ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                            }`}>
                              {r.customer_status === "new" ? "신규" : r.customer_status === "existing" ? "기존" : r.customer_status || "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <OnlineNav />
    </div>
  );
}