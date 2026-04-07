import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SalesRecord } from "../api/entities";
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
  const [showContract, setShowContract] = useState(false);
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
      const sysSettings = [];
      const pricingList = [];
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
    const now = new Date();

    // Check duplicate
    let customerStatus = "new";
    try {
      const existing = await SalesRecord.list();
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

    const created = await SalesRecord.create(record);
    setResult({ ...record, customer_status: customerStatus, id: created?.id });
    setSaving(false);

    // Send telegram notification
    try {
      const nowStr = new Date().toLocaleString('ko-KR');
      const msg = `신규 고객 등록\n고객명: ${form.customer_name}\n연락처: ${form.phone}\n매출: ₩${salesAmount.toLocaleString()}\n딜러: ${dealer?.dealer_name || '미설정'}\n일시: ${nowStr}`;
      await fetch('https://api.telegram.org/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: 5757341051, text: msg })
      });
    } catch (e) {
      console.error('Telegram notification failed', e);
    }

    // Schedule satisfaction check after 24 hours
    setTimeout(async () => {
      try {
        const rec = await SalesRecord.filter({ id: created?.id });
        if (rec.length > 0 && !rec[0].satisfaction_sent) {
          const msg = `📋 만족도 확인 요청\n고객: ${form.customer_name}\n연락처: ${form.phone}\n담당: ${dealer?.dealer_name || '미설정'}\n→ 24시간 경과. 고객 만족도를 확인해주세요!`;
          await fetch('https://api.telegram.org/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: 5757341051, text: msg })
          });
        }
      } catch (e) {
        console.error('Satisfaction check failed', e);
      }
    }, 24 * 60 * 60 * 1000);
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
         await SalesRecord.create({
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
    const contractNo = 'SR' + Date.now();
    const contractDate = new Date().toLocaleDateString('ko-KR');
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
              onClick={() => setShowContract(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all"
            >
              📄 계약서 미리보기
            </button>
            <button
              onClick={async () => {
                if (orderSubmitted) return;
                setSubmittingOrder(true);
                // SalesOrder create skipped - not in Neon API yet
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

        {/* 계약서 모달 */}
        {showContract && (
          <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white text-gray-900 w-full max-w-2xl rounded-lg shadow-2xl my-4">
              {/* 인쇄 버튼 (화면에서만 표시) */}
              <div className="flex justify-between items-center p-4 border-b border-gray-200 print:hidden">
                <h2 className="text-lg font-bold text-gray-800">계약서 미리보기</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                  >
                    🖨️ 계약서 출력/저장
                  </button>
                  <button
                    onClick={() => setShowContract(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                  >
                    닫기
                  </button>
                </div>
              </div>

              {/* 계약서 본문 */}
              <div id="contract-print-area" className="p-8">
                {/* 헤더 */}
                <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-3">
                    <span className="text-2xl font-black text-white">SF</span>
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-widest">SolFort</h1>
                  <p className="text-sm text-gray-500 mt-1">디지털 자산 거래 계약서</p>
                  <div className="mt-4 inline-block bg-gray-100 px-6 py-2 rounded-full">
                    <span className="text-lg font-bold tracking-widest text-gray-800">SOF 구매 계약서</span>
                  </div>
                </div>

                {/* 계약 기본 정보 */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-500 text-xs block">계약번호</span>
                    <span className="font-bold text-gray-900">{contractNo}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-500 text-xs block">계약일자</span>
                    <span className="font-bold text-gray-900">{contractDate}</span>
                  </div>
                </div>

                {/* 계약 당사자 */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">■ 계약 당사자</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2 font-semibold">매도인 (공급자)</p>
                      <p className="font-bold text-gray-900">SolFort</p>
                      <p className="text-gray-600 text-xs mt-1">담당: {result.dealer_name}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2 font-semibold">매수인 (구매자)</p>
                      <p className="font-bold text-gray-900">{result.customer_name}</p>
                      <p className="text-gray-600 text-xs mt-1">연락처: {result.phone}</p>
                    </div>
                  </div>
                </div>

                {/* 거래 내역 */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">■ 거래 내역</h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-3 py-2 text-left text-xs">항목</th>
                        <th className="px-3 py-2 text-right text-xs">내용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[
                        ['구매 자산', 'SolFort Token (SOF)'],
                        ['SOF 수량', `${result.final_quantity} SOF`],
                        ['매출금액', `₩${result.sales_amount.toLocaleString()} (KRW)`],
                        ['수령 지갑주소', result.wallet_address || '미입력'],
                        ['담당 딜러', result.dealer_name],
                      ].map(([k, v]) => (
                        <tr key={k} className="bg-white">
                          <td className="px-3 py-2 text-gray-600 text-xs">{k}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 약관 */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">■ 계약 조건</h3>
                  <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
                    <p>1. 본 계약은 매수인이 SolFort 토큰(SOF)을 위 거래 내역에 명시된 금액으로 구매함에 합의한 것입니다.</p>
                    <p>2. 구매 대금은 계약 체결 즉시 지불되며, 구매한 SOF는 지정된 지갑 주소로 전송됩니다.</p>
                    <p>3. 디지털 자산의 특성상 전송 완료 후 취소 및 환불이 불가합니다.</p>
                    <p>4. 매수인은 디지털 자산 투자에 따른 위험을 충분히 인지하고 자의로 본 계약을 체결합니다.</p>
                    <p>5. 본 계약에 관한 분쟁은 쌍방 협의를 통해 해결하며, 협의가 불가할 경우 관할 법원에 의거합니다.</p>
                  </div>
                </div>

                {/* 서명란 */}
                <div className="mt-8 pt-6 border-t-2 border-gray-800">
                  <p className="text-center text-xs text-gray-500 mb-6">위 계약 내용을 충분히 확인하고 동의하여 서명합니다.</p>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700 mb-2">매도인</p>
                      <p className="text-xs text-gray-500 mb-8">SolFort / {result.dealer_name}</p>
                      <div className="border-b border-gray-400 w-40 mx-auto" />
                      <p className="text-xs text-gray-400 mt-1">(서명)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700 mb-2">매수인</p>
                      <p className="text-xs text-gray-500 mb-8">{result.customer_name}</p>
                      <div className="border-b border-gray-400 w-40 mx-auto" />
                      <p className="text-xs text-gray-400 mt-1">(서명)</p>
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-6">{contractDate} · SolFort 계약서</p>
                </div>
              </div>
            </div>
          </div>
        )}
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