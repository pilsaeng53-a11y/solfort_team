import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { TrendingUp, CheckCircle } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const STATUS_BADGE = {
  pending: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-blue-500/20 text-blue-400",
};

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallConvert() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const me = Auth.getDealerName();
  const currentUser = Auth.getCurrentUser();

  const [leads, setLeads] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ target_dealer_id: "", customer_name: "", customer_phone: "", memo: "" });
  const [dispatchRequests, setDispatchRequests] = useState([]);
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  const [selectedLeadId, setSelectedLeadId] = useState(state?.lead?.id || "");
  const [form, setForm] = useState({
    customer_name: state?.lead?.name || "",
    phone: state?.lead?.phone || "",
    sales_amount: state?.lead?.interest_amount || "",
    wallet_address: "",
    dealer_id: "",
    dealer_name: "",
  });

  useEffect(() => {
    document.title = "SolFort - 매출 연결";
    Promise.all([
      base44.entities.CallLead.filter({ status: "관심있음" }, "-created_date", 200),
      base44.entities.DealerInfo.filter({ status: "active" }, "dealer_name", 200),
      base44.entities.SystemSettings.list("setting_key", 50),
      base44.entities.MeetingDispatchRequest.filter({ caller_username: currentUser?.username }, "-created_date", 100),
    ]).then(([l, d, ss, dr]) => {
      setLeads(l);
      setDealers(d);
      setDispatchRequests(dr);
      const sm = {};
      ss.forEach(s => { sm[s.setting_key] = s.setting_value; });
      setSettings(sm);
      setLoading(false);
    });
  }, [currentUser?.username]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const pickLead = id => {
    const found = leads.find(l => l.id === id);
    setSelectedLeadId(id);
    if (found) setForm(p => ({ ...p, customer_name: found.name, phone: found.phone, sales_amount: found.interest_amount || "" }));
  };

  const pickDealer = id => {
    const found = dealers.find(d => d.id === id);
    setForm(p => ({ ...p, dealer_id: id, dealer_name: found?.dealer_name || "" }));
  };

  const sofPrice = Number(settings.sof_price) || 0;
  const usdtRate = Number(settings.usdt_rate) || 1350;
  const promoPct = Number(settings.promotion_pct) || 300;
  const salesKrw = Number(form.sales_amount) || 0;
  const usdtAmt = sofPrice > 0 && usdtRate > 0 ? salesKrw / usdtRate : 0;
  const baseQty = sofPrice > 0 ? usdtAmt / sofPrice : 0;
  const finalQty = baseQty * (1 + promoPct / 100);

  const submitDispatch = async () => {
    if (!dispatchForm.target_dealer_id || !dispatchForm.customer_name || !dispatchForm.customer_phone) return;
    setSubmittingDispatch(true);
    try {
      const targetDealer = dealers.find(d => d.id === dispatchForm.target_dealer_id);
      const newRequest = await base44.entities.MeetingDispatchRequest.create({
        caller_name: currentUser?.full_name || me,
        caller_username: currentUser?.username || me,
        target_dealer_name: targetDealer?.dealer_name || "",
        customer_name: dispatchForm.customer_name,
        customer_phone: dispatchForm.customer_phone,
        memo: dispatchForm.memo,
        status: "pending",
        requested_at: new Date().toISOString(),
      });
      setDispatchRequests(prev => [newRequest, ...prev]);
      setDispatchForm({ target_dealer_id: "", customer_name: "", customer_phone: "", memo: "" });
      const botToken = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
      const chatId = "5757341051";
      const msg = `[${currentUser?.full_name || me}]→[${targetDealer?.dealer_name}] 파견요청: ${dispatchForm.customer_name} ${dispatchForm.customer_phone}`;
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg }),
      }).catch(() => {});
    } catch (e) {}
    setSubmittingDispatch(false);
  };

  const submit = async () => {
    if (!form.customer_name || !form.phone || !salesKrw || !form.dealer_name) return;
    setSaving(true);
    try {
      await base44.entities.SalesRecord.create({
        dealer_name: form.dealer_name, customer_name: form.customer_name,
        phone: form.phone, wallet_address: form.wallet_address,
        sales_amount: salesKrw, usdt_rate: usdtRate, token_price: sofPrice,
        promotion_pct: promoPct, usdt_amount: usdtAmt,
        base_quantity: baseQty, final_quantity: finalQty,
        customer_status: "new", sale_date: today,
      });
      if (selectedLeadId) {
        await base44.entities.CallLead.update(selectedLeadId, {
          status: "매출전환", converted_at: new Date().toISOString(), dealer_name: form.dealer_name,
        });
        await base44.entities.CallLog.create({
          lead_id: selectedLeadId, lead_name: form.customer_name, phone: form.phone,
          call_result: "매출전환", called_by: me, called_at: new Date().toISOString(),
          memo: "매출 전환 완료",
        });
      }
      setDone(true);
      setTimeout(() => navigate("/call/dashboard"), 2500);
    } catch (e) {
      setSaving(false);
    }
  };

  if (loading) return <><CallNav /><Loader /></>;

  if (done) return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CheckCircle className="h-14 w-14 text-emerald-400" />
        <p className="text-xl font-bold text-white">매출 등록 완료!</p>
        <p className="text-sm text-gray-400">총관리자에게 즉시 반영됩니다.</p>
        <p className="text-xs text-gray-600">잠시 후 대시보드로 이동합니다...</p>
      </div>
    </div>
  );

  const canSubmit = form.customer_name && form.phone && salesKrw > 0 && form.dealer_name;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
        {/* 파견 요청 섹션 */}
        <SFCard className="space-y-4 border border-purple-500/20">
          <h2 className="text-sm font-semibold text-purple-400">📤 파견 요청</h2>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[10px] text-gray-400">대상 대리점 *</label>
              <select value={dispatchForm.target_dealer_id} onChange={e => setDispatchForm(p => ({ ...p, target_dealer_id: e.target.value }))}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                <option value="">-- 대리점 선택 --</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400">고객명 *</label>
                <input value={dispatchForm.customer_name} onChange={e => setDispatchForm(p => ({ ...p, customer_name: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">연락처 *</label>
                <input value={dispatchForm.customer_phone} onChange={e => setDispatchForm(p => ({ ...p, customer_phone: e.target.value }))}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400">메모</label>
              <textarea value={dispatchForm.memo} onChange={e => setDispatchForm(p => ({ ...p, memo: e.target.value }))} rows={2}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
            </div>
            <button onClick={submitDispatch} disabled={submittingDispatch || !dispatchForm.target_dealer_id || !dispatchForm.customer_name || !dispatchForm.customer_phone}
              className="w-full py-2.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold hover:bg-purple-500/30 disabled:opacity-40 transition-all">
              {submittingDispatch ? "전송 중..." : "파견 요청"}
            </button>
          </div>
        </SFCard>

        {/* 파견 요청 목록 */}
        {dispatchRequests.length > 0 && (
          <SFCard className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400">내 파견 요청 ({dispatchRequests.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dispatchRequests.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-2 border-l-2 border-purple-500/30 pl-2.5 py-1.5 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{r.customer_name} ({r.customer_phone})</p>
                    <p className="text-[10px] text-gray-500">{r.target_dealer_name}</p>
                    {r.memo && <p className="text-[10px] text-gray-600 mt-0.5">{r.memo}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0 whitespace-nowrap ${STATUS_BADGE[r.status] || "bg-gray-500/20 text-gray-400"}`}>
                    {r.status === "pending" ? "대기" : r.status === "accepted" ? "수락" : r.status === "rejected" ? "거절" : "완료"}
                  </span>
                </div>
              ))}
            </div>
          </SFCard>
        )}

        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">매출 연결</h1>
        </div>
        <p className="text-xs text-gray-500 -mt-2">관심 고객을 실제 매출로 등록합니다</p>

        {/* 매출 연결 섹션 */}
        <SFCard className="space-y-4">
          <h3 className="text-sm font-semibold text-white">① 고객 선택</h3>
          <div>
            <label className="text-[10px] text-gray-400">관심 고객 선택</label>
            <select value={selectedLeadId} onChange={e => pickLead(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
              <option value="">-- 선택 (또는 직접 입력) --</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.phone}) {l.interest_amount ? `- ₩${Number(l.interest_amount).toLocaleString()}` : ""}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["customer_name","고객명 *"],["phone","연락처 *"]].map(([k,l]) => (
              <div key={k}>
                <label className="text-[10px] text-gray-400">{l}</label>
                <input value={form[k]} onChange={set(k)} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
            ))}
          </div>
        </SFCard>

        <SFCard className="space-y-4">
          <h3 className="text-sm font-semibold text-white">② 매출 정보</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400">판매금액 KRW *</label>
              <input type="number" value={form.sales_amount} onChange={set("sales_amount")}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">지갑주소</label>
              <input value={form.wallet_address} onChange={set("wallet_address")}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400">연결 대리점 *</label>
            <select value={form.dealer_id} onChange={e => pickDealer(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
              <option value="">-- 대리점 선택 --</option>
              {dealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name}</option>)}
            </select>
          </div>
          {sofPrice > 0 && salesKrw > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] text-emerald-400 font-semibold">SOF 계산 미리보기</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <span className="text-gray-500">SOF 단가</span><span className="text-white">${sofPrice} USDT</span>
                <span className="text-gray-500">USDT 환율</span><span className="text-white">₩{usdtRate.toLocaleString()}</span>
                <span className="text-gray-500">USDT 금액</span><span className="text-blue-400">{usdtAmt.toFixed(2)} USDT</span>
                <span className="text-gray-500">기본 SOF</span><span className="text-white">{baseQty.toFixed(0)} SOF</span>
                <span className="text-gray-500">프로모션</span><span className="text-yellow-400">+{promoPct}%</span>
                <span className="text-gray-500">최종 SOF</span><span className="text-emerald-400 font-bold">{finalQty.toFixed(0)} SOF</span>
              </div>
            </div>
          )}
        </SFCard>

        <button onClick={submit} disabled={saving || !canSubmit}
          className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
          {saving ? "등록 중..." : "매출 등록"}
        </button>
      </div>
    </div>
  );
}

// Auth helper
Auth.getCurrentUser = function() {
  try {
    const stored = localStorage.getItem('_auth_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};