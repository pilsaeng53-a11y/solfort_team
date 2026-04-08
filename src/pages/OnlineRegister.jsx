import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { Auth } from "@/api/neonClient";
import OnlineNav from "../components/OnlineNav";
import { toast } from "sonner";

export default function OnlineRegister() {
  const username = Auth.getDealerName() || localStorage.getItem("sf_dealer_name") || "";
  const [dealers, setDealers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    sales_amount: "",
    dealer_name: "",
    from_call_team: "",
    memo: "",
  });

  useEffect(() => {
    Promise.all([
      base44.entities.DealerInfo.filter({ status: "active" }, "-created_date", 300),
      base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 300),
    ]).then(([d, c]) => {
      setDealers(d.filter(x => x.role !== "manager"));
      const uniqueTeams = [...new Set(c.map(m => m.team).filter(Boolean))];
      setTeams(uniqueTeams);
    });
  }, []);

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.customer_name || !form.phone || !form.sales_amount) {
      toast.error("고객명, 연락처, 매출금액은 필수입니다.");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.SalesRecord.create({
        customer_name: form.customer_name,
        phone: form.phone,
        sales_amount: Number(form.sales_amount),
        dealer_name: form.dealer_name,
        from_call_team: form.from_call_team,
        registered_by_online: username,
        registered_at: new Date().toISOString(),
        memo: form.memo,
        sale_date: new Date().toISOString().split("T")[0],
      });
      toast.success("DB가 성공적으로 등록되었습니다!");
      setForm({ customer_name: "", phone: "", sales_amount: "", dealer_name: "", from_call_team: "", memo: "" });
    } catch (e) {
      toast.error("등록 실패: " + e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080a12] border-b border-white/[0.06] px-5 py-4">
        <h1 className="text-base font-bold text-emerald-400">DB 등록</h1>
        <p className="text-[10px] text-gray-500">온라인팀 신규 고객 등록</p>
      </div>

      <div className="px-4 pt-5 max-w-lg mx-auto">
        <div className="bg-[#0d1117] border border-white/[0.06] rounded-2xl p-5 space-y-4">

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">고객명 *</label>
            <input
              value={form.customer_name}
              onChange={setF("customer_name")}
              placeholder="홍길동"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">연락처 *</label>
            <input
              value={form.phone}
              onChange={setF("phone")}
              placeholder="010-0000-0000"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">매출금액 (원) *</label>
            <input
              type="number"
              value={form.sales_amount}
              onChange={setF("sales_amount")}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">연결 대리점</label>
            <select
              value={form.dealer_name}
              onChange={setF("dealer_name")}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">선택 안함</option>
              {dealers.map(d => (
                <option key={d.id} value={d.dealer_name}>{d.dealer_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">연결 콜팀</label>
            <select
              value={form.from_call_team}
              onChange={setF("from_call_team")}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">선택 안함</option>
              {teams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">메모</label>
            <textarea
              value={form.memo}
              onChange={setF("memo")}
              placeholder="특이사항 입력..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
          >
            {submitting ? "등록 중..." : "✅ DB 등록하기"}
          </button>
        </div>
      </div>

      <OnlineNav />
    </div>
  );
}