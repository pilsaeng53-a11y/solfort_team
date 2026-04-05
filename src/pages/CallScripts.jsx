import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Plus, Copy, Check, ChevronDown, ChevronUp, X } from "lucide-react";

const CATEGORIES = ["신규고객", "망설이는고객", "비교고객", "리크루팅"];
const CAT_BADGE = {
  신규고객: "bg-blue-500/20 text-blue-400",
  망설이는고객: "bg-yellow-500/20 text-yellow-400",
  비교고객: "bg-purple-500/20 text-purple-400",
  리크루팅: "bg-emerald-500/20 text-emerald-400",
};

const SEED_SCRIPTS = [
  { title: "신규 고객 첫 통화", category: "신규고객", content: "안녕하세요, SolFort에서 연락드립니다. 혹시 SOF 투자에 관심 있으신가요? 현재 특별 프로모션으로 최대 400% 혜택을 드리고 있습니다.", tips: "밝고 친근하게, 첫 10초가 중요합니다", order_num: 1 },
  { title: "망설이는 고객 설득", category: "망설이는고객", content: "이해합니다. 많은 분들이 처음엔 망설이시는데, 실제로 시작하신 분들은 대부분 만족하고 계세요. 소액으로 먼저 체험해보시는 건 어떨까요?", tips: "공감 먼저, 강요하지 말 것", order_num: 2 },
  { title: "타사 비교 고객", category: "비교고객", content: "SolFort만의 차별점은 프로모션 수량입니다. 타사 대비 최대 4배 더 받으실 수 있어요. 지금 비교해드릴까요?", tips: "구체적인 수치로 비교, 자신감 있게", order_num: 3 },
  { title: "리크루팅 스크립트", category: "리크루팅", content: "안녕하세요. 혹시 부업이나 추가 수입에 관심 있으신가요? SolFort 대리점으로 등록하시면 매출의 10~50%를 커미션으로 받으실 수 있습니다.", tips: "상대방 상황 파악 후 맞춤 접근", order_num: 4 },
];

const EMPTY_FORM = { title: "", category: "신규고객", content: "", tips: "", order_num: 0 };

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallScripts() {
  const me = Auth.getDealerName();
  const role = Auth.getRole();
  const isAdmin = role === "call_admin" || role === "super_admin";

  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("전체");
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "SolFort - 콜 스크립트";
    loadScripts();
  }, []);

  const loadScripts = async () => {
    const data = await base44.entities.CallScript.list("order_num", 200);
    if (data.length === 0) {
      const created = await Promise.all(
        SEED_SCRIPTS.map(s => base44.entities.CallScript.create({ ...s, is_active: true, created_by: me, created_at: new Date().toISOString() }))
      );
      setScripts(created);
    } else {
      setScripts(data.filter(s => s.is_active));
    }
    setLoading(false);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    const created = await base44.entities.CallScript.create({
      ...form, order_num: Number(form.order_num), is_active: true,
      created_by: me, created_at: new Date().toISOString(),
    });
    setScripts(prev => [...prev, created]);
    setForm(EMPTY_FORM); setShowForm(false); setSaving(false);
  };

  const copy = async (s) => {
    await navigator.clipboard.writeText(s.content);
    setCopied(s.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = scripts.filter(s => catFilter === "전체" || s.category === catFilter);

  if (loading) return <><CallNav /><Loader /></>;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">콜 스크립트</h1>
          {isAdmin && (
            <button onClick={() => setShowForm(p => !p)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 transition-all">
              <Plus className="h-3.5 w-3.5" /> 스크립트 추가
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {["전체", ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${catFilter === c ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-500"}`}>
              {c}
            </button>
          ))}
        </div>

        {showForm && isAdmin && (
          <SFCard className="border border-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">새 스크립트</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400">제목 *</label>
                  <input value={form.title} onChange={set("title")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">카테고리</label>
                  <select value={form.category} onChange={set("category")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400">스크립트 내용 *</label>
                <textarea value={form.content} onChange={set("content")} rows={5}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-y font-mono" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">💡 팁</label>
                <textarea value={form.tips} onChange={set("tips")} rows={2}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">순서</label>
                <input type="number" value={form.order_num} onChange={set("order_num")} className="w-24 mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving || !form.title || !form.content}
                className="px-5 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-emerald-500/30 transition-all">
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs">취소</button>
            </div>
          </SFCard>
        )}

        <div className="space-y-3">
          {filtered.length === 0 && <p className="text-center py-12 text-xs text-gray-600">스크립트가 없습니다</p>}
          {filtered.map(s => (
            <SFCard key={s.id}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{s.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${CAT_BADGE[s.category] || "bg-white/5 text-gray-400"}`}>{s.category}</span>
                  </div>
                  {expanded !== s.id && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">{s.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => copy(s)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] transition-all ${copied === s.id ? "bg-emerald-500/30 text-emerald-300" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                    {copied === s.id ? <><Check className="h-3 w-3" /> 복사됨!</> : <><Copy className="h-3 w-3" /> 복사</>}
                  </button>
                  <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-all">
                    {expanded === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {expanded === s.id && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
                  <div className="bg-white/[0.02] rounded-xl p-4">
                    <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{s.content}</p>
                  </div>
                  {s.tips && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                      <p className="text-[10px] text-yellow-400 font-semibold mb-1">💡 팁</p>
                      <p className="text-xs text-gray-400">{s.tips}</p>
                    </div>
                  )}
                </div>
              )}
            </SFCard>
          ))}
        </div>
      </div>
    </div>
  );
}