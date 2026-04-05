import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import SFCard from "../components/SFCard";
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";

const CATEGORIES = ["신규고객", "망설이는고객", "비교고객", "리크루팅"];
const EMPTY_FORM = { title: "", category: "신규고객", content: "", tips: "", order_num: 0 };

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}

export default function CallScripts() {
  const me = Auth.getDealerName();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    document.title = "SolFort - 콜 스크립트";
    base44.entities.CallScript.list("order_num", 200).then(setScripts).finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    if (editId) {
      await base44.entities.CallScript.update(editId, { ...form, order_num: Number(form.order_num) });
      setScripts(prev => prev.map(s => s.id === editId ? { ...s, ...form } : s));
      setEditId(null);
    } else {
      const created = await base44.entities.CallScript.create({ ...form, order_num: Number(form.order_num), is_active: true, created_by: me, created_at: new Date().toISOString() });
      setScripts(prev => [...prev, created]);
    }
    setForm(EMPTY_FORM); setShowForm(false); setSaving(false);
  };

  const del = async id => {
    await base44.entities.CallScript.delete(id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const startEdit = s => { setForm({ title: s.title, category: s.category, content: s.content, tips: s.tips || "", order_num: s.order_num || 0 }); setEditId(s.id); setShowForm(true); };

  const filtered = scripts.filter(s => s.is_active && (catFilter === "all" || s.category === catFilter));

  if (loading) return <Loader />;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">콜 스크립트</h1>
        <button onClick={() => { setShowForm(p => !p); setEditId(null); setForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30">
          <Plus className="h-3.5 w-3.5" /> 스크립트 추가
        </button>
      </div>

      {showForm && (
        <SFCard className="border border-emerald-500/20">
          <h3 className="text-sm font-semibold text-white mb-4">{editId ? "스크립트 수정" : "새 스크립트"}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">제목<span className="text-red-400">*</span></label>
                <input value={form.title} onChange={set("title")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-400">분류</label>
                <select value={form.category} onChange={set("category")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">스크립트 내용<span className="text-red-400">*</span></label>
              <textarea value={form.content} onChange={set("content")} rows={6}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-y font-mono leading-relaxed" />
            </div>
            <div>
              <label className="text-xs text-gray-400">추가 팁</label>
              <textarea value={form.tips} onChange={set("tips")} rows={2}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs">취소</button>
          </div>
        </SFCard>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${catFilter === "all" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>전체</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${catFilter === c ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400"}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-center py-10 text-xs text-gray-600">스크립트가 없습니다</p>}
        {filtered.map(s => (
          <SFCard key={s.id}>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{s.title}</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{s.category}</span>
                </div>
                {expanded !== s.id && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.content}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(s)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-all"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => del(s.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-all"><Trash2 className="h-3 w-3" /></button>
                <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="p-1.5 text-gray-600 hover:text-gray-400 transition-all">
                  {expanded === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {expanded === s.id && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">{s.content}</p>
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
  );
}