import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SalesRecord } from "../api/entities";
import SFCard from "../components/SFCard";
import StatusBadge from "../components/StatusBadge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Star } from "lucide-react";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "today", label: "오늘" },
  { key: "new", label: "🟡 신규" },
  { key: "existing", label: "🟢 기존" },
  { key: "duplicate", label: "🔴 중복" },
];

export default function ViewRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showRating, setShowRating] = useState(null);
  const [selectedRating, setSelectedRating] = useState({});
  const [savingRating, setSavingRating] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const all = await SalesRecord.list();
      setRecords(all);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const saveRating = async (recordId, rating) => {
    setSavingRating(recordId);
    await SalesRecord.update(recordId, {
      satisfaction_sent: true,
      satisfaction_rating: rating,
    });
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, satisfaction_sent: true, satisfaction_rating: rating } : r));
    setShowRating(null);
    setSelectedRating({});
    setSavingRating(null);
  };

  const filtered = records.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.customer_name?.toLowerCase().includes(q) && !r.phone?.includes(q) && !r.wallet_address?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filter === "today") return r.sale_date === today;
    if (filter === "new") return r.customer_status === "new";
    if (filter === "existing") return r.customer_status === "existing";
    if (filter === "duplicate") return r.customer_status === "duplicate";
    return true;
  });

  const totalSales = filtered.reduce((sum, r) => sum + (r.sales_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <h1 className="text-base font-bold text-white">매출내역</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 전화번호, 지갑주소 검색"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Total */}
        <SFCard>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">총 매출 합계</p>
              <p className="text-xl font-bold text-white mt-0.5">₩{totalSales.toLocaleString()}</p>
            </div>
            <span className="text-xs text-gray-500">{filtered.length}건</span>
          </div>
        </SFCard>

        {/* Records */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-600 py-12 text-sm">등록된 내역이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id}>
                <SFCard>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{r.customer_name}</p>
                        <StatusBadge status={r.customer_status} />
                        {r.satisfaction_sent && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">✓ 확인완료</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{r.phone}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{r.sale_date} · {r.dealer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">₩{r.sales_amount?.toLocaleString()}</p>
                      <p className="text-xs text-blue-400 mt-0.5">{r.final_quantity?.toFixed(1)} SOF</p>
                    </div>
                  </div>
                  {r.satisfaction_rating && (
                    <p className="text-[10px] text-yellow-400 mb-2">만족도: {'⭐'.repeat(r.satisfaction_rating)}</p>
                  )}
                  {!r.satisfaction_sent && (
                    <button onClick={() => setShowRating(showRating === r.id ? null : r.id)}
                      className="w-full px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-[10px] font-medium hover:bg-purple-500/30 transition-all">
                      만족도 확인 완료
                    </button>
                  )}
                </SFCard>
                {showRating === r.id && (
                  <SFCard className="bg-purple-500/5 border-purple-500/30 mt-2">
                    <p className="text-xs text-gray-400 mb-3">고객 만족도를 선택해주세요</p>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setSelectedRating(p => ({ ...p, [r.id]: star }))}
                          className={`text-2xl transition-all ${(selectedRating[r.id] || 0) >= star ? 'text-yellow-400' : 'text-gray-500'}`}>
                          ⭐
                        </button>
                      ))}
                    </div>
                    <button onClick={() => saveRating(r.id, selectedRating[r.id] || 0)} disabled={savingRating === r.id || !selectedRating[r.id]}
                      className="w-full px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-medium hover:bg-purple-500/30 disabled:opacity-40 transition-all mt-3">
                      {savingRating === r.id ? '저장 중...' : '저장'}
                    </button>
                  </SFCard>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}