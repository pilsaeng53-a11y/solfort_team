import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SFCard from "../components/SFCard";
import StatusBadge from "../components/StatusBadge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";

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

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.SalesRecord.list("-created_date", 500);
      setRecords(all);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
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
              <SFCard key={r.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{r.customer_name}</p>
                      <StatusBadge status={r.customer_status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{r.phone}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{r.sale_date} · {r.dealer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₩{r.sales_amount?.toLocaleString()}</p>
                    <p className="text-xs text-blue-400 mt-0.5">{r.final_quantity?.toFixed(1)} SOF</p>
                  </div>
                </div>
              </SFCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}