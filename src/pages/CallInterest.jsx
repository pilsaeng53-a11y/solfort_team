import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Star, Phone, Plus, X, ChevronDown } from "lucide-react";
import CustomerTimeline from "@/components/CustomerTimeline";
import { Auth } from "@/lib/auth";

const INTEREST_ORDER = { 높음: 0, 중간: 1, 낮음: 2 };
const INTEREST_STYLE = {
  높음: { badge: "bg-red-500/20 text-red-400 border-red-500/30", icon: "🔥" },
  중간: { badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: "⭐" },
  낮음: { badge: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: "" },
};

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallInterest() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("전체");
  const [memos, setMemos] = useState([]);
  const [memoModal, setMemoModal] = useState(null);
  const [memoText, setMemoText] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [expandedMemos, setExpandedMemos] = useState({});
  const [timelineOpen, setTimelineOpen] = useState(null);

  useEffect(() => {
    document.title = "SolFort - 관심 고객";
    base44.entities.CallLead.filter({ status: "관심" }, "-created_date", 300)
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const lo = (INTEREST_ORDER[a.interest_level] ?? 2) - (INTEREST_ORDER[b.interest_level] ?? 2);
          if (lo !== 0) return lo;
          return (b.interest_amount || 0) - (a.interest_amount || 0);
        });
        setLeads(sorted);
      })
      .finally(() => setLoading(false));
    base44.entities.FollowupMemo.list("-created_at", 500).then(setMemos).catch(() => {});
  }, []);

  const filtered = leads.filter(l => levelFilter === "전체" || l.interest_level === levelFilter);
  const getLeadMemos = (leadId) => memos.filter(m => m.lead_id === leadId);

  const saveMemo = async () => {
    if (!memoText.trim() || !memoModal) return;
    setSavingMemo(true);
    const created = await base44.entities.FollowupMemo.create({
      lead_id: memoModal.id, lead_name: memoModal.name, memo: memoText.trim(),
      created_by: Auth.getDealerName(), created_at: new Date().toISOString(),
    });
    setMemos(prev => [created, ...prev]);
    setMemoText(""); setMemoModal(null); setSavingMemo(false);
  };

  const relTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h/24)}일 전`;
  };

  const totalAmount = filtered.reduce((a, l) => a + (l.interest_amount || 0), 0);

  if (loading) return <><CallNav /><Loader /></>;

  return (
    <>
      <div className="min-h-screen bg-[#080a12]">
        <CallNav />
        <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-400" />
            <h1 className="text-lg font-bold text-white">관심 고객</h1>
            <span className="text-sm bg-yellow-500/20 text-yellow-400 px-2.5 py-0.5 rounded-full">총 {leads.length}명</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "🔥 높음", value: leads.filter(l=>l.interest_level==="높음").length, color: "text-red-400" },
              { label: "⭐ 중간", value: leads.filter(l=>l.interest_level==="중간").length, color: "text-yellow-400" },
              { label: "예상 금액", value: "₩" + (totalAmount/10000).toFixed(0) + "만", color: "text-emerald-400" },
            ].map(s => (
              <SFCard key={s.label} className="text-center py-3">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </SFCard>
            ))}
          </div>

          <div className="flex gap-2">
            {["전체","높음","중간","낮음"].map(v => (
              <button key={v} onClick={() => setLevelFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${levelFilter === v ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-white/5 text-gray-500"}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.length === 0 && <p className="col-span-2 text-center py-12 text-xs text-gray-600">관심 고객이 없습니다</p>}
            {filtered.map(lead => {
              const iStyle = INTEREST_STYLE[lead.interest_level] || INTEREST_STYLE.낮음;
              const lm = getLeadMemos(lead.id);
              const isExpanded = expandedMemos[lead.id];
              const shownMemos = isExpanded ? lm : lm.slice(0, 3);
              return (
                <SFCard key={lead.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{lead.name}</span>
                        {lead.interest_level && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${iStyle.badge}`}>{iStyle.icon} {lead.interest_level}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{lead.phone}</p>
                      {lead.interest_amount > 0 && (
                        <p className="text-sm text-emerald-400 font-semibold mt-1">₩{Number(lead.interest_amount).toLocaleString()}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${lead.next_call_date ? "text-yellow-400" : "text-red-400"}`}>
                        📅 {lead.next_call_date || "재콜일 미지정"}
                      </p>
                      {lead.memo && <p className="text-[10px] text-gray-600 mt-1 truncate">{lead.memo}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                    <button onClick={() => navigate("/call/logs")}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 text-gray-400 rounded-lg text-[10px] hover:bg-white/10 transition-all">
                      <Phone className="h-3 w-3" /> 콜 기록
                    </button>
                    <button onClick={() => { setMemoModal(lead); setMemoText(""); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] hover:bg-blue-500/20 transition-all">
                      <Plus className="h-3 w-3" /> 메모
                    </button>
                    <button onClick={() => navigate("/call/convert", { state: { lead } })}
                      className="flex-1 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] hover:bg-emerald-500/30 transition-all">
                      매출 등록
                    </button>
                    <button onClick={() => setTimelineOpen(lead)}
                      className="flex-1 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] hover:bg-blue-500/30 transition-all">
                      전체 이력
                    </button>
                  </div>
                  {lm.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
                      {shownMemos.map(m => (
                        <div key={m.id} className="bg-white/[0.03] border-l-2 border-emerald-500/50 pl-2.5 py-1.5 rounded-r-lg">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[9px] text-gray-600">{relTime(m.created_at)}</span>
                            <span className="text-[9px] text-emerald-400/70">{m.created_by}</span>
                          </div>
                          <p className="text-[10px] text-gray-300">{m.memo}</p>
                        </div>
                      ))}
                      {lm.length > 3 && (
                        <button onClick={() => setExpandedMemos(p => ({ ...p, [lead.id]: !isExpanded }))}
                          className="text-[9px] text-gray-500 hover:text-gray-300 flex items-center gap-1">
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {isExpanded ? '접기' : `${lm.length - 3}개 더 보기`}
                        </button>
                      )}
                    </div>
                  )}
                </SFCard>
              );
            })}
          </div>
        </div>
      </div>

      {timelineOpen && (
        <CustomerTimeline lead={timelineOpen} onClose={() => setTimelineOpen(null)} />
      )}

      {memoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">메모 추가 - {memoModal.name}</h3>
              <button onClick={() => setMemoModal(null)}><X className="h-4 w-4 text-gray-500" /></button>
            </div>
            <div className="p-5">
              <textarea value={memoText} onChange={e => setMemoText(e.target.value)} rows={4}
                placeholder="팔로업 메모 입력..."
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none placeholder:text-gray-600" />
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={saveMemo} disabled={savingMemo || !memoText.trim()}
                className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-40">
                {savingMemo ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setMemoModal(null)} className="px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl text-xs">취소</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
}