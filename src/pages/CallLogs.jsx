import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { Auth } from "@/api/neonClient";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Plus, X } from "lucide-react";

const RESULTS = ["미응답", "연결됨", "관심없음", "관심있음", "재콜필요"];
const RESULT_BADGE = {
  미응답: "bg-gray-500/20 text-gray-400",
  연결됨: "bg-blue-500/20 text-blue-400",
  관심없음: "bg-red-500/20 text-red-400",
  관심있음: "bg-emerald-500/20 text-emerald-400",
  재콜필요: "bg-yellow-500/20 text-yellow-400",
};

const today = new Date().toISOString().split("T")[0];
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

const EMPTY = { lead_id: "", lead_name: "", phone: "", call_result: "연결됨", call_duration: "", memo: "", next_call_date: "" };

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallLogs() {
  const me = Auth.getDealerName();
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");
  const [resultFilter, setResultFilter] = useState("전체");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [directInput, setDirectInput] = useState(false);

  useEffect(() => {
    document.title = "SolFort - 콜 기록";
    Promise.all([
      base44.entities.CallLog.list("-called_at", 500),
      base44.entities.CallLead.list("-created_date", 300),
    ]).then(([lg, l]) => { setLogs(lg); setLeads(l); setLoading(false); });
  }, []);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const pickLead = id => {
    const found = leads.find(l => l.id === id);
    if (found) setForm(p => ({ ...p, lead_id: id, lead_name: found.name, phone: found.phone }));
    else setForm(p => ({ ...p, lead_id: "" }));
  };

  const save = async () => {
    setSaving(true);
    const log = await base44.entities.CallLog.create({
      ...form, called_by: me, called_at: new Date().toISOString(),
    });
    setLogs(prev => [log, ...prev]);
    if (form.lead_id) {
      if (form.call_result === "관심있음") {
        await base44.entities.CallLead.update(form.lead_id, { status: "관심있음" });
      }
      if (form.call_result === "재콜필요" && form.next_call_date) {
        await base44.entities.CallLead.update(form.lead_id, { next_call_date: form.next_call_date, status: "연락됨" });
      }
      if (form.call_result === "연결됨") {
        await base44.entities.CallLead.update(form.lead_id, { status: "연락됨" });
      }
    }
    setShowModal(false); setForm(EMPTY); setSaving(false);
  };

  const filtered = logs.filter(l => {
    const d = (l.called_at || "").split("T")[0];
    const inDate = dateFilter === "today" ? d === today : dateFilter === "week" ? d >= weekAgo : true;
    const inResult = resultFilter === "전체" || l.call_result === resultFilter;
    return inDate && inResult;
  });

  if (loading) return <><CallNav /><Loader /></>;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">콜 기록</h1>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 transition-all">
            <Plus className="h-3.5 w-3.5" /> 콜 기록 추가
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[["today","오늘"],["week","이번주"],["all","전체"]].map(([v,l]) => (
            <button key={v} onClick={() => setDateFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${dateFilter === v ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-gray-500"}`}>{l}</button>
          ))}
          <div className="w-px bg-white/10 mx-1" />
          {["전체", ...RESULTS].map(r => (
            <button key={r} onClick={() => setResultFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${resultFilter === r ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-500"}`}>{r}</button>
          ))}
        </div>

        <p className="text-xs text-gray-600">{filtered.length}건</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/[0.06]">
                {["시간","고객명","연락처","결과","통화시간","메모"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-600">콜 기록이 없습니다</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-all">
                  <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{(l.called_at || "").replace("T"," ").substring(0,16)}</td>
                  <td className="py-3 px-3 text-white font-medium">{l.lead_name}</td>
                  <td className="py-3 px-3 text-gray-400">{l.phone}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${RESULT_BADGE[l.call_result] || "bg-white/5 text-gray-400"}`}>{l.call_result}</span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{l.call_duration || "-"}</td>
                  <td className="py-3 px-3 text-gray-500 max-w-[160px] truncate">{l.memo || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">콜 기록 추가</h3>
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setDirectInput(false)} className={`text-xs px-3 py-1 rounded-lg ${!directInput ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-400"}`}>리드 선택</button>
                <button onClick={() => setDirectInput(true)} className={`text-xs px-3 py-1 rounded-lg ${directInput ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-400"}`}>직접 입력</button>
              </div>
              {!directInput ? (
                <div>
                  <label className="text-[10px] text-gray-400">고객 선택</label>
                  <select onChange={e => pickLead(e.target.value)} value={form.lead_id}
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    <option value="">-- 고객 선택 --</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[["lead_name","고객 이름"],["phone","연락처"]].map(([k,l]) => (
                    <div key={k}>
                      <label className="text-[10px] text-gray-400">{l}</label>
                      <input value={form[k]} onChange={set(k)} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400">통화 결과</label>
                  <select value={form.call_result} onChange={set("call_result")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    {RESULTS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">통화 시간</label>
                  <input value={form.call_duration} onChange={set("call_duration")} placeholder="예: 3분 20초" className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                </div>
              </div>
              {form.call_result === "재콜필요" && (
                <div>
                  <label className="text-[10px] text-red-400">재콜 예정일 *</label>
                  <input type="date" value={form.next_call_date} onChange={set("next_call_date")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                </div>
              )}
              <div>
                <label className="text-[10px] text-gray-400">메모</label>
                <textarea value={form.memo} onChange={set("memo")} rows={3} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl text-xs">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}