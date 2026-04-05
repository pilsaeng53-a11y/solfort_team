import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";
import jsPDF from "jspdf";

export default function AnalyticsDashboard() {
  const [dealers, setDealers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    Promise.all([
      base44.entities.DealerInfo.list("-created_date", 500),
      base44.entities.SalesRecord.list("-created_date", 5000),
    ]).then(([d, r]) => {
      setDealers(d);
      setRecords(r);
      setLoading(false);
    });
  }, []);

  // 기간별 매출 추이
  const getSalesTrend = () => {
    const today = new Date();
    let dateMap = {};

    if (period === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dateMap[key] = { date: key.slice(5), sales: 0, count: 0 };
      }
    } else if (period === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dateMap[key] = { date: key.slice(5), sales: 0, count: 0 };
      }
    } else {
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const month = key.slice(5, 7);
        dateMap[month] = dateMap[month] || { date: `${month}월`, sales: 0, count: 0 };
        dateMap[month].sales += (records.find(r => r.sale_date === key)?.sales_amount || 0);
        dateMap[month].count += (records.filter(r => r.sale_date === key).length || 0);
      }
      return Object.values(dateMap).reverse();
    }

    records.forEach(r => {
      if (dateMap[r.sale_date]) {
        dateMap[r.sale_date].sales += r.sales_amount || 0;
        dateMap[r.sale_date].count += 1;
      }
    });

    return Object.values(dateMap);
  };

  // 딜러 등급별 실적
  const getGradePerformance = () => {
    const gradeMap = { GREEN: 0, PURPLE: 0, GOLD: 0, PLATINUM: 0 };
    dealers.forEach(d => {
      const sales = records.filter(r => r.dealer_name === d.dealer_name).reduce((a, r) => a + (r.sales_amount || 0), 0);
      gradeMap[d.grade || "GREEN"] += sales;
    });
    return [
      { grade: "GREEN", sales: gradeMap.GREEN },
      { grade: "PURPLE", sales: gradeMap.PURPLE },
      { grade: "GOLD", sales: gradeMap.GOLD },
      { grade: "PLATINUM", sales: gradeMap.PLATINUM },
    ].filter(g => g.sales > 0);
  };

  // 고객 리텐션 분석 (신규 vs 기존)
  const getRetention = () => {
    const today = new Date();
    let dateMap = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dateMap[key] = { date: key.slice(5), new: 0, existing: 0 };
    }

    records.forEach(r => {
      if (dateMap[r.sale_date]) {
        if (r.customer_status === "new") dateMap[r.sale_date].new += 1;
        else if (r.customer_status === "existing") dateMap[r.sale_date].existing += 1;
      }
    });

    return Object.values(dateMap);
  };

  const salesTrend = getSalesTrend();
  const gradePerf = getGradePerformance();
  const retention = getRetention();

  const totalSales = records.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const avgSales = records.length > 0 ? Math.round(totalSales / records.length) : 0;
  const newCount = records.filter(r => r.customer_status === "new").length;
  const retentionRate = records.length > 0 ? ((records.length - newCount) / records.length * 100).toFixed(1) : 0;

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("매출 분석 리포트", 14, 15);
    doc.setFontSize(10);
    doc.text(`생성일: ${new Date().toLocaleDateString("ko-KR")}`, 14, 25);

    let y = 35;
    doc.setFontSize(12);
    doc.text("📊 주요 지표", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`총 매출: ₩${(totalSales / 10000).toFixed(0)}만`, 14, y);
    y += 6;
    doc.text(`평균 단가: ₩${(avgSales / 10000).toFixed(0)}만`, 14, y);
    y += 6;
    doc.text(`신규 고객: ${newCount}명`, 14, y);
    y += 6;
    doc.text(`리텐션율: ${retentionRate}%`, 14, y);

    y += 15;
    doc.setFontSize(12);
    doc.text("💰 딜러 등급별 실적", 14, y);
    y += 8;
    doc.setFontSize(10);
    gradePerf.forEach(g => {
      doc.text(`${g.grade}: ₩${(g.sales / 10000).toFixed(0)}만`, 14, y);
      y += 6;
    });

    doc.save("analytics_report.pdf");
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["week", "month", "quarter"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${period === p ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
              {p === "week" ? "주간" : p === "month" ? "월간" : "분기"}
            </button>
          ))}
        </div>
        <button onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30 transition-all">
          <Download className="h-3.5 w-3.5" /> PDF 다운로드
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "총 매출", value: `₩${(totalSales / 10000).toFixed(0)}만`, color: "text-yellow-400" },
          { label: "평균 단가", value: `₩${(avgSales / 10000).toFixed(0)}만`, color: "text-blue-400" },
          { label: "신규 고객", value: `${newCount}명`, color: "text-emerald-400" },
          { label: "리텐션율", value: `${retentionRate}%`, color: "text-purple-400" },
        ].map(s => (
          <SFCard key={s.label}>
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </SFCard>
        ))}
      </div>

      <SFCard>
        <p className="text-xs text-gray-400 mb-3">📈 기간별 매출 추이</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={salesTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#facc15" strokeWidth={2} name="매출(만원)" />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="건수" />
          </LineChart>
        </ResponsiveContainer>
      </SFCard>

      <SFCard>
        <p className="text-xs text-gray-400 mb-3">💰 딜러 등급별 실적</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={gradePerf}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="grade" tick={{ fontSize: 10, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Bar dataKey="sales" fill="#10b981" name="매출(원)" />
          </BarChart>
        </ResponsiveContainer>
      </SFCard>

      <SFCard>
        <p className="text-xs text-gray-400 mb-3">👥 고객 리텐션 분석</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={retention}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Tooltip contentStyle={{ background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="new" stroke="#facc15" strokeWidth={2} name="신규 고객" />
            <Line type="monotone" dataKey="existing" stroke="#10b981" strokeWidth={2} name="기존 고객" />
          </LineChart>
        </ResponsiveContainer>
      </SFCard>
    </div>
  );
}