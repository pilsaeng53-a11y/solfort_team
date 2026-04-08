import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/neonClient";
import SFCard from "../components/SFCard";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Hash, DollarSign, UserPlus, Users } from "lucide-react";

export default function DailySales() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

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

  const dayRecords = records.filter((r) => r.sale_date === selectedDate);
  const totalSales = dayRecords.reduce((sum, r) => sum + (r.sales_amount || 0), 0);
  const newCount = dayRecords.filter((r) => r.customer_status === "new").length;
  const existingCount = dayRecords.filter((r) => r.customer_status === "existing").length;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <h1 className="text-base font-bold text-white">일자별 매출</h1>
        </div>

        {/* Date Picker */}
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white/5 border-white/10 text-white rounded-xl [color-scheme:dark]"
        />

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="총 건수" value={dayRecords.length} icon={<Hash className="h-4 w-4" />} />
          <StatCard label="총 매출" value={`₩${(totalSales / 10000).toFixed(0)}만`} icon={<DollarSign className="h-4 w-4" />} />
          <StatCard label="신규" value={newCount} icon={<UserPlus className="h-4 w-4" />} />
          <StatCard label="기존" value={existingCount} icon={<Users className="h-4 w-4" />} />
        </div>

        {/* Records */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : dayRecords.length === 0 ? (
          <p className="text-center text-gray-600 py-12 text-sm">해당 날짜에 등록된 내역이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {dayRecords.map((r) => (
              <SFCard key={r.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{r.customer_name}</p>
                      <StatusBadge status={r.customer_status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₩{r.sales_amount?.toLocaleString()}</p>
                    <p className="text-xs text-blue-400">{r.final_quantity?.toFixed(1)} SOF</p>
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