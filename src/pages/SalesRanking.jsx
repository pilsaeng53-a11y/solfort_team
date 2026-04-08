import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/neonClient";
import SFCard from "../components/SFCard";
import GradeBadge from "../components/GradeBadge";
import { ArrowLeft, Trophy } from "lucide-react";

const PERIODS = [
  { key: "today", label: "오늘" },
  { key: "month", label: "이번달" },
  { key: "all", label: "누적" },
];

export default function SalesRanking() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");

  const today = new Date().toISOString().split("T")[0];
  const monthPrefix = today.slice(0, 7);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRecords, allDealers] = await Promise.all([
        base44.entities.SalesRecord.list("-created_date", 1000),
        base44.entities.DealerInfo.list("-created_date", 100),
      ]);
      setRecords(allRecords);
      setDealers(allDealers);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (period === "today") return r.sale_date === today;
    if (period === "month") return r.sale_date?.startsWith(monthPrefix);
    return true;
  });

  // Group by dealer
  const dealerMap = {};
  filteredRecords.forEach((r) => {
    if (!dealerMap[r.dealer_name]) {
      dealerMap[r.dealer_name] = { name: r.dealer_name, total: 0, count: 0 };
    }
    dealerMap[r.dealer_name].total += r.sales_amount || 0;
    dealerMap[r.dealer_name].count += 1;
  });

  const ranking = Object.values(dealerMap).sort((a, b) => b.total - a.total);

  const getGrade = (dealerName) => {
    const d = dealers.find((d) => d.dealer_name === dealerName);
    return d?.grade || "GREEN";
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h1 className="text-base font-bold text-white">매출 랭킹</h1>
          </div>
        </div>

        {/* Period */}
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                period === p.key
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Ranking */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-center text-gray-600 py-12 text-sm">매출 데이터가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {ranking.map((r, i) => (
              <SFCard key={r.name} className={i < 3 ? "border-yellow-500/20" : ""} glow={i === 0}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-lg font-bold">
                    {i < 3 ? medals[i] : <span className="text-sm text-gray-500">{i + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{r.name}</p>
                      <GradeBadge grade={getGrade(r.name)} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.count}건</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₩{r.total.toLocaleString()}</p>
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