import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Plus, X, ChevronDown } from "lucide-react";

const STATUS_OPTS = ["신규", "연락됨", "관심있음", "거절", "매출전환"];
const COLOR_FILTERS = [
  { key: "전체", label: "전체" },
  { key: "blue", label: "파란 거절" },
  { key: "yellow", label: "노란 가망" },
  { key: "red", label: "빨강 수낙" },
  { key: "none", label: "미태깅" },
];
const COLOR_BORDER = { blue: "border-l-4 border-blue-500", yellow: "border-l-4 border-yellow-500", red: "border-l-4 border-red-500" };
const STATUS_BADGE = {
  신규: "bg-gray-500/20 text-gray-400",
  연락됨: "bg-blue-500/20 text-blue-400",
  관심있음: "bg-emerald-500/20 text-emerald-400",
  거절: "bg-red-500/20 text-red-400",
  매출전환: "bg-purple-500/20 text-purple-400",
};
const SOURCE_LABELS = { sns: "SNS", referral: "추천", cold_call: "콜드콜", event: "이벤트", other: "기타" };
const INTEREST_STYLE = {
  높음: { badge: "bg-red-500/20 text-red-400", icon: "🔥" },
  중간: { badge: "bg-yellow-500/20 text-yellow-400", icon: "⭐" },
  낮음: { badge: "bg-gray-500/20 text-gray-400", icon: "" },
};

const EMPTY = { name: "", phone: "", source: "cold_call", interest_amount: "", interest_level: "중간", memo: "", tags: "" };
const PRESET_TAGS = ["#투자경험", "#고액관심", "#재통화약속", "#VIP", "#신중", "#빠른결정"];

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallLeads() {
  const navigate = useNavigate();
  const me = Auth.getDealerName();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("전체");
  const [colorFilter, setColorFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [openStatus, setOpenStatus] = useState(null);
  const [tagFilter, setTagFilter] = useState("");

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
      status: "신규", created_by: me, assigned_to: me,
      created_at: new Date().toISOString(),
    });
    setShowModal(false); setForm(EMPTY);
    await load(); setSaving(false);
  };

  const changeStatus = async (id, status) => {
    await base44.entities.CallLead.update(id, { status });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setOpenStatus(null);
  };

  const toggleBookmark = async (id, isBookmarked) => {
    await base44.entities.CallLead.update(id, { is_bookmarked: !isBookmarked });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, is_bookmarked: !isBookmarked } : l));
  };

  const toggleTag = (tag) => {
    const tags = (form.tags || "").split(",").filter(Boolean);
    if (tags.includes(tag)) {
      form.tags = tags.filter(t => t !== tag).join(",");
    } else {
      tags.push(tag);
      form.tags = tags.join(",");
    }
    setForm({ ...form });
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchS = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q);
    const matchT = tab === "전체" || l.status === tab;
    const matchC = colorFilter === "전체" || (colorFilter === "none" ? !l.color_tag : l.color_tag === colorFilter);
    const matchTag = !tagFilter || (l.tags || "").includes(tagFilter);
    return matchS && matchT && matchC && matchTag;
  });

  if (loading) return <><CallNav /><Loader /></>;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">고객 리드 <span className="text-sm font-normal text-gray-500">({filtered.length})</span></h1>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 transition-all">
            <Plus className="h-3.5 w-3.5" /> 리드 추가
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {["전체", ...STATUS_OPTS].map(s => (
            <button key={s} onClick={() => setTab(s)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${tab === s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[["전체","전체"],["blue","파란(거절)"],["yellow","노란(가망)"],["red","빨간(수락)"],["미태깅","미태깅"]].map(([v,l]) => (
            <button key={v} onClick={() => setColorFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${colorFilter === v ? "bg-white/20 text-white border border-white/30" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
              {v === "blue" ? "🔵" : v === "yellow" ? "🟡" : v === "red" ? "🔴" : ""} {l}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-gray-500 self-center">태그:</span>
          {["", ...PRESET_TAGS].map(t => (
            <button key={t} onClick={() => setTagFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] transition-all ${tagFilter === t ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
              {t || "전체"}
            </button>
          ))}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 또는 연락처 검색"
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-600" />

        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center py-12 text-xs text-gray-600">리드가 없습니다</p>}
          {filtered.map(lead => {
            const iStyle = INTEREST_STYLE[lead.interest_level] || INTEREST_STYLE["낙음"];
            const borderCls = COLOR_BORDER[lead.color_tag] || "border-l-4 border-transparent";
            return (
              <SFCard key={lead.id} className={borderCls}>
                <div className="flex items-start gap-3" >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{lead.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_BADGE[lead.status] || "bg-white/5 text-gray-400"}`}>{lead.status}</span>
                      {lead.source && <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">{SOURCE_LABELS[lead.source] || lead.source}</span>}
                      {lead.interest_level && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${iStyle.badge}`}>{iStyle.icon} {lead.interest_level}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{lead.phone}</p>
                    {lead.tags && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {lead.tags.split(",").filter(Boolean).map(tag => (
                          <span key={tag} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-gray-500">
                      {lead.interest_amount > 0 && <span className="text-emerald-400">₩{Number(lead.interest_amount).toLocaleString()}</span>}
                      {lead.next_call_date && <span className="text-yellow-400">📅 {lead.next_call_date}</span>}
                      {lead.memo && <span className="truncate max-w-[150px]">{lead.memo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleBookmark(lead.id, lead.is_bookmarked)}
                      className={`text-lg transition-all ${lead.is_bookmarked ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}>
                      ⭐
                    </button>
                    <button onClick={() => navigate("/call/logs")}
                      className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all whitespace-nowrap">
                      콜 기록 추가
                    </button>
                    <div className="relative">
                      <button onClick={() => setOpenStatus(openStatus === lead.id ? null : lead.id)}
                        className="flex items-center gap-1 text-[10px] bg-white/5 text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-all">
                        상태 변경 <ChevronDown className="h-3 w-3" />
                      </button>
                      {openStatus === lead.id && (
                        <div className="absolute right-0 top-8 z-20 bg-[#10131e] border border-white/10 rounded-xl shadow-xl min-w-[110px]">
                          {STATUS_OPTS.map(s => (
                            <button key={s} onClick={() => changeStatus(lead.id, s)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-all first:rounded-t-xl last:rounded-b-xl ${lead.status === s ? "text-emerald-400" : "text-gray-300"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SFCard>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">리드 추가</h3>
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["name","고객 이름",true],["phone","연락처",true]].map(([k,l,req]) => (
                  <div key={k}>
                    <label className="text-[10px] text-gray-400">{l}{req && <span className="text-red-400">*</span>}</label>
                    <input value={form[k]} onChange={set(k)} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400">유입 경로</label>
                  <select value={form.source} onChange={set("source")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    {Object.entries(SOURCE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">관심도</label>
                  <select value={form.interest_level} onChange={set("interest_level")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    {["높음","중간","낮음"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400">관심 금액</label>
                <input type="number" value={form.interest_amount} onChange={set("interest_amount")} placeholder="0" className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                 <label className="text-[10px] text-gray-400">메모</label>
                 <textarea value={form.memo} onChange={set("memo")} rows={2} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
               </div>
               <div>
                 <label className="text-[10px] text-gray-400">고객 태그</label>
                 <div className="flex flex-wrap gap-1.5 mt-1">
                   {PRESET_TAGS.map(tag => {
                     const isSelected = (form.tags || "").includes(tag);
                     return (
                       <button key={tag} onClick={() => toggleTag(tag)} type="button"
                         className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                           isSelected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                         }`}>
                         {tag}
                       </button>
                     );
                   })}
                 </div>
               </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={save} disabled={saving || !form.name || !form.phone}
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