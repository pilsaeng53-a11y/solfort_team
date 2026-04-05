import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import SFCard from "../components/SFCard";
import { Plus, Phone, X, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_OPTS = ["new", "연락됨", "관심있음", "거절", "매출전환"];
const STATUS_COLORS = {
  new: "bg-blue-500/20 text-blue-400", 연락됨: "bg-gray-500/20 text-gray-400",
  관심있음: "bg-emerald-500/20 text-emerald-400", 거절: "bg-red-500/20 text-red-400",
  매출전환: "bg-purple-500/20 text-purple-400",
};
const STATUS_KR = { new: "신규" };
const SOURCE_LABELS = { sns: "SNS", referral: "추천", cold_call: "콜드콜", event: "이벤트", other: "기타" };

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}

const EMPTY_FORM = { name: "", phone: "", source: "cold_call", interest_amount: "", interest_level: "중간", next_call_date: "", memo: "" };

export default function CallLeads() {
  const me = Auth.getDealerName();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [logForm, setLogForm] = useState({});
  const [showLogFor, setShowLogFor] = useState(null);

  useEffect(() => {
    document.title = "SolFort - 고객 리드";
    load();
  }, []);

  const load = () => base44.entities.CallLead.list("-created_date", 500).then(setLeads).finally(() => setLoading(false));

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    await base44.entities.CallLead.create({
      ...form,
      interest_amount: form.interest_amount ? Number(form.interest_amount) : 0,
      assigned_to: me, created_by: me, status: "new",
      created_at: new Date().toISOString(),
    });
    setShowForm(false); setForm(EMPTY_FORM);
    await load(); setSaving(false);
  };

  const updateStatus = async (id, status) => {
    const extra = status === "매출전환" ? { converted_at: new Date().toISOString() } : {};
    await base44.entities.CallLead.update(id, { status, ...extra });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status, ...extra } : l));
  };

  const saveLog = async (lead) => {
    const lf = logForm[lead.id] || {};
    await base44.entities.CallLog.create({
      lead_id: lead.id, lead_name: lead.name, phone: lead.phone,
      call_result: lf.call_result || "연결됨", call_duration: lf.call_duration || "",
      memo: lf.memo || "", next_call_date: lf.next_call_date || "",
      called_by: me, called_at: new Date().toISOString(),
    });
    if (lf.call_result) await updateStatus(lead.id, lf.call_result === "관심있음" ? "관심있음" : lf.call_result === "관심없음" ? "거절" : "연락됨");
    if (lf.next_call_date) await base44.entities.CallLead.update(lead.id, { next_call_date: lf.next_call_date });
    setLogForm(p => { const n = { ...p }; delete n[lead.id]; return n; });
    setShowLogFor(null);
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <Loader />;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">고객 리드</h1>
        <button onClick={() => setShowForm(p => !p)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 transition-all">
          <Plus className="h-3.5 w-3.5" /> 리드 추가
        </button>
      </div>

      {showForm && (
        <SFCard className="border border-emerald-500/20">
          <h3 className="text-sm font-semibold text-white mb-4">신규 리드 등록</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["name","고객 이름","text",true],["phone","연락처","text",true],["interest_amount","관심 금액","number",false],["next_call_date","다음 콜 예정일","date",false]].map(([k,l,t,req]) => (
              <div key={k}>
                <label className="text-xs text-gray-400">{l}{req && <span className="text-red-400">*</span>}</label>
                <input type={t} value={form[k]} onChange={set(k)}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400">유입 경로</label>
              <select value={form.source} onChange={set("source")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                {Object.entries(SOURCE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">관심도</label>
              <select value={form.interest_level} onChange={set("interest_level")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                {["높음","중간","낮음"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400">메모</label>
              <textarea value={form.memo} onChange={set("memo")} rows={2}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs">취소</button>
          </div>
        </SFCard>
      )}

      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 / 연락처 검색"
          className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
        <button onClick={() => setStatusFilter("all")} className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === "all" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>전체</button>
        {STATUS_OPTS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>
            {STATUS_KR[s] || s}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-600">{filtered.length}건</p>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center py-10 text-xs text-gray-600">리드가 없습니다</p>}
        {filtered.map(lead => (
          <SFCard key={lead.id} className="space-y-0">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{lead.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] || "bg-white/5 text-gray-400"}`}>{STATUS_KR[lead.status] || lead.status}</span>
                  {lead.interest_level && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${lead.interest_level === "높음" ? "bg-emerald-500/20 text-emerald-400" : lead.interest_level === "중간" ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-gray-500"}`}>{lead.interest_level}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{lead.phone}</p>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  {lead.source && <span>{SOURCE_LABELS[lead.source] || lead.source}</span>}
                  {lead.interest_amount > 0 && <span>₩{lead.interest_amount.toLocaleString()}</span>}
                  {lead.next_call_date && <span className="text-yellow-400">📅 {lead.next_call_date}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setShowLogFor(showLogFor === lead.id ? null : lead.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] hover:bg-emerald-500/30 transition-all">
                  <Phone className="h-3 w-3" /> 콜 기록
                </button>
                <button onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)} className="text-gray-600 hover:text-gray-400 transition-all">
                  {expandedId === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showLogFor === lead.id && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                <p className="text-xs font-medium text-gray-300">콜 결과 기록</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">결과</label>
                    <select value={logForm[lead.id]?.call_result || "연결됨"}
                      onChange={e => setLogForm(p => ({ ...p, [lead.id]: { ...p[lead.id], call_result: e.target.value } }))}
                      className="w-full mt-0.5 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs">
                      {["미응답","연결됨","관심없음","관심있음","재콜필요"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">통화 시간</label>
                    <input placeholder="예: 3분 20초" value={logForm[lead.id]?.call_duration || ""}
                      onChange={e => setLogForm(p => ({ ...p, [lead.id]: { ...p[lead.id], call_duration: e.target.value } }))}
                      className="w-full mt-0.5 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">재콜 예정일</label>
                    <input type="date" value={logForm[lead.id]?.next_call_date || ""}
                      onChange={e => setLogForm(p => ({ ...p, [lead.id]: { ...p[lead.id], next_call_date: e.target.value } }))}
                      className="w-full mt-0.5 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">메모</label>
                    <input placeholder="메모" value={logForm[lead.id]?.memo || ""}
                      onChange={e => setLogForm(p => ({ ...p, [lead.id]: { ...p[lead.id], memo: e.target.value } }))}
                      className="w-full mt-0.5 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveLog(lead)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px]">저장</button>
                  <button onClick={() => setShowLogFor(null)} className="px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-[10px]">취소</button>
                </div>
              </div>
            )}

            {expandedId === lead.id && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                {lead.memo && <p className="text-xs text-gray-400 mb-2">📝 {lead.memo}</p>}
                <div className="flex gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-600">상태 변경:</span>
                  {STATUS_OPTS.map(s => (
                    <button key={s} onClick={() => updateStatus(lead.id, s)} disabled={lead.status === s}
                      className={`px-2 py-0.5 rounded text-[10px] transition-all ${lead.status === s ? "bg-emerald-500/30 text-emerald-300" : "bg-white/5 text-gray-500 hover:bg-white/10"}`}>
                      {STATUS_KR[s] || s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SFCard>
        ))}
      </div>
    </div>
  );
}