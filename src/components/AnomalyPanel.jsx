import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
const thisMonthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
const lastMonthStart = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
})();
const lastMonthEnd = (() => {
  const d = new Date();
  d.setDate(0);
  return d.toISOString().split("T")[0];
})();

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}

export default function AnomalyPanel() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    (async () => {
      const [dealers, sales, pending] = await Promise.all([
        base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 500),
        base44.entities.SalesRecord.list("-created_date", 5000),
        base44.entities.DealerInfo.filter({ status: "pending" }, "-created_date", 200),
      ]);

      const found = [];

      // 1. 오늘 미활동 딜러
      const todaySalesNames = new Set(sales.filter(s => s.sale_date === today).map(s => s.dealer_name));
      const inactive = dealers.filter(d => !todaySalesNames.has(d.dealer_name));
      if (inactive.length > 0) {
        found.push({
          level: "danger",
          title: `오늘 미활동 딜러 ${inactive.length}명`,
          detail: inactive.slice(0, 5).map(d => d.dealer_name).join(", ") + (inactive.length > 5 ? ` 외 ${inactive.length - 5}명` : ""),
        });
      }

      // 2. 비정상 고액 거래 (평균의 3배 이상)
      const todaySales = sales.filter(s => s.sale_date === today);
      if (todaySales.length > 1) {
        const avg = todaySales.reduce((a, s) => a + (s.sales_amount || 0), 0) / todaySales.length;
        const outliers = todaySales.filter(s => (s.sales_amount || 0) >= avg * 3);
        outliers.forEach(s => {
          found.push({
            level: "danger",
            title: "비정상 고액 거래 감지",
            detail: `${s.dealer_name} — ₩${(s.sales_amount || 0).toLocaleString()} (평균 ₩${Math.round(avg).toLocaleString()}의 ${Math.round(s.sales_amount / avg)}배)`,
          });
        });
      }

      // 3. 오늘 중복 등록 5건 이상
      const dupCounts = {};
      sales.filter(s => s.sale_date === today && s.customer_status === "duplicate").forEach(s => {
        dupCounts[s.dealer_name] = (dupCounts[s.dealer_name] || 0) + 1;
      });
      Object.entries(dupCounts).filter(([, n]) => n >= 5).forEach(([name, n]) => {
        found.push({ level: "danger", title: "중복 과다", detail: `${name} — 오늘 중복 ${n}건` });
      });

      // 4. 7일 이상 미활동 딜러 (주의)
      const recentNames = new Set(sales.filter(s => s.sale_date >= sevenDaysAgo).map(s => s.dealer_name));
      const longInactive = dealers.filter(d => !recentNames.has(d.dealer_name));
      if (longInactive.length > 0) {
        found.push({
          level: "warning",
          title: `7일 이상 미활동 딜러 ${longInactive.length}명`,
          detail: longInactive.slice(0, 5).map(d => d.dealer_name).join(", "),
        });
      }

      // 5. 이번달 vs 지난달 매출 50% 이하
      const thisMonth = {};
      const lastMonth = {};
      sales.filter(s => s.sale_date >= thisMonthStart).forEach(s => {
        thisMonth[s.dealer_name] = (thisMonth[s.dealer_name] || 0) + (s.sales_amount || 0);
      });
      sales.filter(s => s.sale_date >= lastMonthStart && s.sale_date <= lastMonthEnd).forEach(s => {
        lastMonth[s.dealer_name] = (lastMonth[s.dealer_name] || 0) + (s.sales_amount || 0);
      });
      Object.entries(lastMonth).forEach(([name, lastAmt]) => {
        const thisAmt = thisMonth[name] || 0;
        if (lastAmt > 0 && thisAmt < lastAmt * 0.5) {
          found.push({
            level: "warning",
            title: "매출 급감 딜러",
            detail: `${name} — 이번달 ₩${thisAmt.toLocaleString()} (지난달 대비 ${Math.round(thisAmt / lastAmt * 100)}%)`,
          });
        }
      });

      // 6. 3일 이상 승인 대기
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
      const longPending = pending.filter(d => (d.created_date || "").split("T")[0] <= threeDaysAgo);
      if (longPending.length > 0) {
        found.push({
          level: "warning",
          title: `승인 대기 3일 초과 ${longPending.length}건`,
          detail: longPending.slice(0, 3).map(d => d.dealer_name).join(", "),
        });
      }

      setAlerts(found);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader />;

  const dangers = alerts.filter(a => a.level === "danger");
  const warnings = alerts.filter(a => a.level === "warning");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">🔍 실시간 이상 감지</h3>
        <span className="text-[10px] text-gray-500">페이지 로드 시점 기준</span>
      </div>

      {alerts.length === 0 ? (
        <SFCard>
          <div className="flex items-center gap-3 py-2">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">✅ 현재 이상 징후 없음</p>
              <p className="text-xs text-gray-500 mt-0.5">모든 지표가 정상 범위입니다</p>
            </div>
          </div>
        </SFCard>
      ) : (
        <>
          {dangers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> 위험</h4>
              {dangers.map((a, i) => (
                <SFCard key={i} className="border border-red-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.detail}</p>
                    </div>
                  </div>
                </SFCard>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-yellow-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> 주의</h4>
              {warnings.map((a, i) => (
                <SFCard key={i} className="border border-yellow-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.detail}</p>
                    </div>
                  </div>
                </SFCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}