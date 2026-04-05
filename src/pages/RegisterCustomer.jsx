import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SFCard from "../components/SFCard";
import UsdtBanner from "../components/UsdtBanner";
import StatusBadge from "../components/StatusBadge";
import useMarketData from "../lib/useMarketData";
import useDealer from "../lib/useDealer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Upload } from "lucide-react";
import * as XLSX from 'xlsx';

export default function RegisterCustomer() {
  const navigate = useNavigate();
  const { rate, source, loading: rateLoading, fetchRate } = useMarketData();
  const { dealer } = useDealer();
  const [tab, setTab] = useState('single');
  const [form, setForm] = useState({ customer_name: "", phone: "", wallet_address: "", sales_amount: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [excelLoading, setExcelLoading] = useState(false);

  const [tokenPrice, setTokenPrice] = useState(3.2);
  const [promotionPct, setPromotionPct] = useState(300);
  const [currentRate, setCurrentRate] = useState(rate || 1500);

  useEffect(() => {
    (async () => {
      const dealerName = localStorage.getItem("sf_dealer_name");
      const [sysSettings, pricingList] = await Promise.all([
        base44.entities.SystemSettings.list(),
        base44.entities.DealerPricing.list(),
      ]);
      const sofPrice = parseFloat(sysSettings.find(s => s.setting_key === "sof_price")?.setting_value || "3.2");
      const autoRate = sysSettings.find(s => s.setting_key === "usdt_rate_auto")?.setting_value === "true";
      const manualRate = parseFloat(sysSettings.find(s => s.setting_key === "usdt_rate_manual")?.setting_value || "1500");
      const promoDefault = parseFloat(sysSettings.find(s => s.setting_key === "promo_default")?.setting_value || "300");

      const dealerPricing = pricingList.find(p => p.dealer_name === dealerName);
      const effectivePrice = dealerPricing?.custom_sof_price || sofPrice;
      const effectivePromo = dealerPricing?.custom_promo_pct || promoDefault;

      setTokenPrice(effectivePrice);
      setPromotionPct(effectivePromo);
      if (!autoRate) setCurrentRate(manualRate);
    })();
  }, []);

  const salesAmount = parseFloat(form.sales_amount) || 0;
  const usdtAmount = salesAmount / currentRate;
  const baseQty = usdtAmount / tokenPrice;
  const finalQty = baseQty * (promotionPct / 100);

  const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleRegister = async () => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    // Check duplicate
    let customerStatus = "new";
    try {
      const existing = await base44.entities.SalesRecord.list("-created_date", 500);
      const todayMatch = existing.find(
        (r) => r.sale_date === today && (r.phone === form.phone || (form.wallet_address && r.wallet_address === form.wallet_address))
      );
      if (todayMatch) {
        customerStatus = "duplicate";
      } else {
        const previousMatch = existing.find(
          (r) => r.sale_date !== today && (r.phone === form.phone || (form.wallet_address && r.wallet_address === form.wallet_address))
        );
        if (previousMatch) {
          customerStatus = "existing";
        }
      }
    } catch {
      // ignore
    }

    const record = {
      dealer_name: dealer?.dealer_name || "미설정",
      customer_name: form.customer_name,
      phone: form.phone,
      wallet_address: form.wallet_address,
      sales_amount: salesAmount,
      usdt_rate: currentRate,
      token_price: tokenPrice,
      promotion_pct: promotionPct,
      usdt_amount: parseFloat(usdtAmount.toFixed(2)),
      base_quantity: parseFloat(baseQty.toFixed(2)),
      final_quantity: parseFloat(finalQty.toFixed(2)),
      customer_status: customerStatus,
      sale_date: today,
    };

    const created = await base44.entities.SalesRecord.create(record);
    setResult({ ...record, customer_status: customerStatus, id: created?.id });
    setSaving(false);

    // Send telegram notification
    try {
      const now = new Date().toLocaleString('ko-KR');
      const msg = `신규 고객 등록\n고객명: ${form.customer_name}\n연락처: ${form.phone}\n매출: ₩${salesAmount.toLocaleString()}\n딜러: ${dealer?.dealer_name || '미설정'}\n일시: ${now}`;
      await fetch('https://api.telegram.org/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: 5757341051, text: msg })
      });
    } catch (e) {
      console.error('Telegram notification failed', e);
    }
  };

  const valid = form.customer_name && form.phone && salesAmount > 0;

  const handleExcelUpload = async (e) => {
   const file = e.target.files?.[0];
   if (!file) return;
   setExcelLoading(true);
   try {
     const data = await file.arrayBuffer();
     const wb = XLSX.read(data);
     const ws = wb.Sheets[wb.SheetNames[0]];
     const rows = XLSX.utils.sheet_to_json(ws);
     const mapped = rows.map(r => ({
       customer_name: r['고객명'] || '',
       phone: r['연락처'] || '',
       sales_amount: parseFloat(r['매출금액'] || '0'),
       wallet_address: r['지갑주소'] || '',
       sale_date: r['날짜'] || new Date().toISOString().split('T')[0]
     })).filter(r => r.customer_name && r.phone && r.sales_amount > 0);
     setExcelRows(mapped);
   } catch (err) {
     alert('오류: ' + err.message);
   }
   setExcelLoading(false);
  };

  const handleBulkRegister = async () => {
   if (excelRows.length === 0) return;
   setExcelLoading(true);
   const dealerName = dealer?.dealer_name || '미설정';
   let count = 0;
   try {
     for (const row of excelRows) {
       await base44.entities.SalesRecord.create({
         dealer_name: dealerName,
         customer_name: row.customer_name,
         phone: row.phone,
         sales_amount: row.sales_amount,
         wallet_address: row.wallet_address,
         sale_date: row.sale_date,
         customer_status: 'new',
         usdt_rate: currentRate,
         token_price: tokenPrice,
         promotion_pct: promotionPct,
         usdt_amount: parseFloat((row.sales_amount / currentRate).toFixed(2)),
         base_quantity: parseFloat((row.sales_amount / currentRate / tokenPrice).toFixed(2)),
         final_quantity: parseFloat((row.sales_amount / currentRate / tokenPrice * promotionPct / 100).toFixed(2)),
       });
       count++;
     }
     alert(`${count}건 등록 완료`);
     setExcelRows([]);
     setTab('single');
   } catch (err) {
     alert('등록 중 오류: ' + err.message);
   }
   setExcelLoading(false);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center px-4">
        <SFCard glow className="max-w-md w-full text-center">
          <div className="py-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">등록 완료!</h2>
            <div className="flex justify-center">
              <StatusBadge status={result.customer_status} />
            </div>
            <div className="space-y-2 text-left bg-white/5 rounded-xl p-4">
              {[
                ["고객명", result.customer_name],
                ["판매금액", `₩${result.sales_amount.toLocaleString()}`],
                ["USDT", `${result.usdt_amount} USDT`],
                ["최종 SOF", `${result.final_quantity} SOF`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-gray-400">{l}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={async () => {
                if (orderSubmitted) return;
                setSubmittingOrder(true);
                await base44.entities.SalesOrder.create({
                  dealer_name: result.dealer_name,
                  sales_record_id: result.id || "",
                  customer_name: result.customer_name,
                  sales_amount: result.sales_amount,
                  quantity: result.final_quantity,
                  status: "pending",
                  requested_at: new Date().toISOString(),
                });
                setOrderSubmitted(true);
                setSubmittingOrder(false);
              }}
              disabled={orderSubmitted || submittingOrder}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all border ${orderSubmitted ? "bg-white/5 text-gray-500 border-white/10 cursor-not-allowed" : "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"}`}
            >
              {submittingOrder ? "신청 중..." : orderSubmitted ? "✅ 신청완료 (처리중)" : "📦 물량 처리 신청"}
            </button>
            {orderSubmitted && (
              <p className="text-xs text-gray-500 text-center">물량 처리 신청이 완료되었습니다. 관리자 검토 후 처리됩니다.</p>
            )}
            <Button onClick={() => navigate("/dashboard")} className="w-full sf-gradient-btn rounded-xl text-white border-0 h-12 mt-2">
              대시보드로 이동
            </Button>
          </div>
        </SFCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12] relative overflow-hidden">
      <div className="absolute top-10 left-0 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">고객 등록</h1>
            <p className="text-xs text-gray-500">{dealer?.dealer_name || ""}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab('single')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${tab === 'single' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-500'}`}>
            개별 등록
          </button>
          <button onClick={() => setTab('excel')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${tab === 'excel' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-500'}`}>
           엑셀 일괄 등록
          </button>
        </div>

        {tab === 'excel' && (
          <SFCard>
            <h3 className="text-white font-semibold text-sm mb-3">Excel 파일 업로드</h3>
            <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-blue-500/30 rounded-xl cursor-pointer hover:bg-blue-500/5 transition-all">
              <Upload className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">.xlsx, .xls 파일 선택</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
            </label>
            {excelRows.length > 0 && (
              <>
                <p className="text-xs text-emerald-400 mt-3">{excelRows.length}건 인식됨</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[10px] text-gray-400">
                    <thead><tr className="border-b border-white/10">
                      <th className="text-left py-1 px-2">고객명</th>
                      <th className="text-left py-1 px-2">연락처</th>
                      <th className="text-right py-1 px-2">매출금액</th>
                    </tr></thead>
                    <tbody>
                      {excelRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-1 px-2 text-gray-300">{r.customer_name}</td>
                          <td className="py-1 px-2 text-gray-500">{r.phone}</td>
                          <td className="text-right py-1 px-2 text-white">₩{r.sales_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={handleBulkRegister} disabled={excelLoading} className="w-full mt-3 sf-gradient-btn rounded-xl text-white border-0 h-12">
                  {excelLoading ? '등록 중...' : '일괄등록'}
                </Button>
              </>
            )}
          </SFCard>
        )}

        {tab !== 'excel' && (
          <>
            <UsdtBanner rate={rate} source={source} loading={rateLoading} onRefresh={fetchRate} />

        {/* Customer Info */}
        <SFCard>
          <h3 className="text-white font-semibold text-sm mb-3">고객 정보</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-400">고객명 *</Label>
              <Input value={form.customer_name} onChange={update("customer_name")} placeholder="고객명 입력"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">전화번호 *</Label>
              <Input value={form.phone} onChange={update("phone")} placeholder="010-0000-0000"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">지갑주소</Label>
              <Input value={form.wallet_address} onChange={update("wallet_address")} placeholder="SOL 지갑 주소"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 mt-1 rounded-xl" />
            </div>
          </div>
        </SFCard>

        {/* Sales Amount */}
        <SFCard>
          <h3 className="text-white font-semibold text-sm mb-3">판매금액 (KRW)</h3>
          <Input
            type="number"
            value={form.sales_amount}
            onChange={update("sales_amount")}
            placeholder="예: 1000000"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl text-lg h-14"
          />
        </SFCard>

        {/* Calculation */}
        {salesAmount > 0 && (
          <SFCard glow>
            <h3 className="text-white font-semibold text-sm mb-3">💰 계산 결과</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">USDT 환산</span>
                <span className="text-white font-semibold">{usdtAmount.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">기본 SOF 수량</span>
                <span className="text-white font-medium">{baseQty.toFixed(2)} SOF</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-400">최종 SOF ({promotionPct}%)</span>
                <span className="text-blue-400 font-bold text-lg">{finalQty.toFixed(2)} SOF</span>
              </div>
            </div>
          </SFCard>
        )}

            <Button
              onClick={handleRegister}
              disabled={!valid || saving}
              className="w-full sf-gradient-btn rounded-xl text-white border-0 h-14 text-base font-bold"
            >
              {saving ? "등록 중..." : "고객 등록"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}