import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";
import GradeBadge from "./GradeBadge";

const COMMISSION_RATES = { GREEN: 10, PURPLE: 30, GOLD: 40, PLATINUM: 50 };

function getPeriod(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettlementPanel() {
  const [section, setSection] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {["커미션 계산", "엑셀 다운로드", "정산 이력"].map((t, i) => (
          <button key={i} onClick={() => setSection(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${section === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      {section === 0 && <CommissionCalc />}
      {section === 1 && <ExcelDownload />}
      {section === 2 && <SettlementHistory />}
    </div>
  );
}

/* ── 커미션 계산 ── */
function CommissionCalc() {
  const now = new Date();
  const [period, setPeriod] = useState(getPeriod(now));
  const [dealers, setDealers] = useState([]);
  const [sales, setSales] = useState([]);
  const [usdtRate, setUsdtRate] = useState(1450);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, s, sys] = await Promise.all([
        base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 200),
        base44.entities.SalesRecord.list("-created_date", 5000),
        base44.entities.SystemSettings.list(),
      ]);
      setDealers(d); setSales(s);
      const manualRate = parseFloat(sys.find(x => x.setting_key === "usdt_rate_manual")?.setting_value || "1450");
      setUsdtRate(manualRate);
      setLoading(false);
    })();
  }, []);

  const periodSales = sales.filter(s => s.sale_date?.startsWith(period));

  const rows = dealers.map(d => {
    const total = periodSales.filter(s => s.dealer_name === d.dealer_name).reduce((a, s) => a + (s.sales_amount || 0), 0);
    const rate = COMMISSION_RATES[d.grade || "GREEN"];
    const krw = Math.round(total * rate / 100);
    const usdt = usdtRate > 0 ? parseFloat((krw / usdtRate).toFixed(2)) : 0;
    return { ...d, totalSales: total, commissionRate: rate, commissionKrw: krw, commissionUsdt: usdt };
  }).filter(r => r.totalSales > 0).sort((a, b) => b.totalSales - a.totalSales);

  const totalSalesSum = rows.reduce((a, r) => a + r.totalSales, 0);
  const totalKrwSum = rows.reduce((a, r) => a + r.commissionKrw, 0);
  const totalUsdtSum = rows.reduce((a, r) => a + r.commissionUsdt, 0);

  const saveSettlement = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    const existing = await base44.entities.SettlementRecord.filter({ period });
    await Promise.all(rows.map(async r => {
      const data = {
        dealer_name: r.dealer_name, period,
        total_sales: r.totalSales, commission_rate: r.commissionRate,
        commission_krw: r.commissionKrw, commission_usdt: r.commissionUsdt,
        usdt_rate_used: usdtRate, status: "pending",
        created_at: new Date().toISOString(),
      };
      const ex = existing.find(e => e.dealer_name === r.dealer_name);
      if (ex) await base44.entities.SettlementRecord.update(ex.id, data);
      else await base44.entities.SettlementRecord.create(data);
    }));
    setSaving(false);
    alert("정산 내역이 저장되었습니다.");
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div>
          <label className="text-xs text-gray-400 block mb-1">정산 기간</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">USDT 환율</label>
          <input type="number" value={usdtRate} onChange={e => setUsdtRate(parseFloat(e.target.value) || 0)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm w-28" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-10">해당 기간에 매출 데이터가 없습니다</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["대리점명", "등급", "커미션율", "총 매출", "커미션(KRW)", "커미션(USDT)"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-white font-medium">{r.dealer_name}</td>
                    <td className="py-3 px-2"><GradeBadge grade={r.grade || "GREEN"} /></td>
                    <td className="py-3 px-2 text-purple-400 font-bold">{r.commissionRate}%</td>
                    <td className="py-3 px-2 text-white">₩{r.totalSales.toLocaleString()}</td>
                    <td className="py-3 px-2 text-yellow-400 font-medium">₩{r.commissionKrw.toLocaleString()}</td>
                    <td className="py-3 px-2 text-emerald-400 font-medium">{r.commissionUsdt} USDT</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-purple-500/30 bg-purple-500/5">
                  <td className="py-3 px-2 text-purple-400 font-bold" colSpan={3}>합계</td>
                  <td className="py-3 px-2 text-white font-bold">₩{totalSalesSum.toLocaleString()}</td>
                  <td className="py-3 px-2 text-yellow-400 font-bold">₩{totalKrwSum.toLocaleString()}</td>
                  <td className="py-3 px-2 text-emerald-400 font-bold">{totalUsdtSum.toFixed(2)} USDT</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button onClick={saveSettlement} disabled={saving}
            className="w-full py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50">
            {saving ? "저장 중..." : "📋 정산 내역 저장"}
          </button>
        </>
      )}
    </div>
  );
}

/* ── 엑셀 다운로드 ── */
function ExcelDownload() {
  const now = new Date();
  const [period, setPeriod] = useState(getPeriod(now));
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    const [dealers, sales, sys] = await Promise.all([
      base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 200),
      base44.entities.SalesRecord.list("-created_date", 5000),
      base44.entities.SystemSettings.list(),
    ]);
    const usdtRate = parseFloat(sys.find(x => x.setting_key === "usdt_rate_manual")?.setting_value || "1450");
    const periodSales = sales.filter(s => s.sale_date?.startsWith(period));

    const rows = dealers.map(d => {
      const total = periodSales.filter(s => s.dealer_name === d.dealer_name).reduce((a, s) => a + (s.sales_amount || 0), 0);
      const rate = COMMISSION_RATES[d.grade || "GREEN"];
      const krw = Math.round(total * rate / 100);
      const usdt = usdtRate > 0 ? parseFloat((krw / usdtRate).toFixed(2)) : 0;
      return { 대리점명: d.dealer_name, 대리점주: d.owner_name, 등급: d.grade || "GREEN", 커미션율: `${rate}%`, 매출합계: total, 커미션금액: krw, 커미션USDT: usdt, 지갑주소: d.usdt_wallet || "" };
    }).filter(r => r.매출합계 > 0);

    // CSV generation
    const headers = ["대리점명", "대리점주", "등급", "커미션율", "매출합계", "커미션금액", "커미션USDT", "지갑주소"];
    const csvContent = [
      headers.join(","),
      ...rows.map(r => headers.map(h => `"${r[h] ?? ""}"`).join(",")),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `solfort_settlement_${period}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <SFCard className="max-w-md">
      <h3 className="text-sm font-semibold text-white mb-4">정산 내역 다운로드</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">정산 기간</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
        <p className="text-xs text-gray-500">파일명: solfort_settlement_{period}.csv</p>
        <p className="text-xs text-gray-500">컬럼: 대리점명 / 대리점주 / 등급 / 커미션율 / 매출합계 / 커미션금액 / 커미션USDT / 지갑주소</p>
        <button onClick={download} disabled={loading}
          className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50">
          {loading ? "준비 중..." : "📥 CSV 다운로드"}
        </button>
      </div>
    </SFCard>
  );
}

/* ── 정산 이력 ── */
function SettlementHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    base44.entities.SettlementRecord.list("-created_at", 200).then(setRecords).finally(() => setLoading(false));
  }, []);

  const markPaid = async (id) => {
    setUpdating(id);
    const now = new Date().toISOString();
    await base44.entities.SettlementRecord.update(id, { status: "paid", paid_at: now });
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "paid", paid_at: now } : r));
    setUpdating(null);
  };

  const cancel = async (id) => {
    setUpdating(id);
    await base44.entities.SettlementRecord.update(id, { status: "cancelled" });
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "cancelled" } : r));
    setUpdating(null);
  };

  if (loading) return <Loader />;

  return (
    <div className="overflow-x-auto">
      {records.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-10">정산 이력이 없습니다</p>
      ) : (
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["기간", "대리점명", "총매출", "커미션(KRW)", "커미션(USDT)", "상태", "지급일", "처리"].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-2 text-white font-mono">{r.period}</td>
                <td className="py-3 px-2 text-white font-medium">{r.dealer_name}</td>
                <td className="py-3 px-2 text-gray-300">₩{(r.total_sales || 0).toLocaleString()}</td>
                <td className="py-3 px-2 text-yellow-400">₩{(r.commission_krw || 0).toLocaleString()}</td>
                <td className="py-3 px-2 text-emerald-400">{r.commission_usdt || 0} USDT</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    r.status === "paid" ? "bg-emerald-500/20 text-emerald-400" :
                    r.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{r.status === "paid" ? "지급완료" : r.status === "cancelled" ? "취소" : "대기"}</span>
                </td>
                <td className="py-3 px-2 text-gray-500">{r.paid_at ? new Date(r.paid_at).toLocaleDateString("ko-KR") : "-"}</td>
                <td className="py-3 px-2">
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => markPaid(r.id)} disabled={updating === r.id}
                        className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                        지급완료
                      </button>
                      <button onClick={() => cancel(r.id)} disabled={updating === r.id}
                        className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">
                        취소
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}