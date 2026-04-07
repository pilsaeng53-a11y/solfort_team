import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import OnlineNav from "../components/OnlineNav";

function StatCard({ label, value, color = "text-emerald-400" }) {
  return (
    <div className="bg-[#0d1a12] border border-emerald-500/20 rounded-xl p-4">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

export default function OnlineDashboard() {
  const navigate = useNavigate();
  const username = Auth.getDealerName() || localStorage.getItem("sf_dealer_name") || "";
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 1000)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const myRecords = records.filter(r => r.registered_by_online === username);
  const monthlyRecords = myRecords.filter(r => (r.sale_date || "").startsWith(thisMonth));
  const dealerSet = new Set(myRecords.map(r => r.dealer_name).filter(Boolean));
  const callSet = new Set(myRecords.map(r => r.call_member).filter(Boolean));
  const monthlyRevenue = monthlyRecords.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const recentRecords = myRecords.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080a12] border-b border-white/[0.06] px-5 py-4">
        <h1 className="text-base font-bold text-emerald-400">온라인팀 대시보드</h1>
        <p className="text-[10px] text-gray-500">{username || "온라인팀원"}</p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Summary Cards */}
        {loading ? <Loader /> : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="이달 DB등록수" value={`${monthlyRecords.length}건`} />
            <StatCard label="연결 대리점수" value={`${dealerSet.size}곳`} color="text-blue-400" />
            <StatCard label="연결 콜팀수" value={`${callSet.size}명`} color="text-purple-400" />
            <StatCard label="이달 매출기여" value={`₩${(monthlyRevenue / 10000).toFixed(0)}만`} color="text-yellow-400" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/online/register")}
            className="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all"
          >
            📋 DB등록하기
          </button>
          <button
            onClick={() => navigate("/online/performance")}
            className="flex-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-3 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-all"
          >
            📊 실적보기
          </button>
        </div>

        {/* Recent DB List */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-3">최근 DB 등록 내역</h2>
          {loading ? <Loader /> : recentRecords.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-6">등록된 DB가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {recentRecords.map(r => (
                <div key={r.id} className="bg-[#0d1117] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{r.customer_name}</p>
                    <p className="text-[10px] text-gray-500">{r.phone} · {r.dealer_name || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-400 font-semibold">₩{(r.sales_amount || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-600">{r.sale_date || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <OnlineNav />
    </div>
  );
}