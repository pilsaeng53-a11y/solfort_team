import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";
import { Auth } from "@/lib/auth";

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}

const EMPTY_NOTICE = { title: "", content: "", category: "general", target: "all", is_pinned: false, is_published: true };
const EMPTY_ACADEMY = { title: "", description: "", category: "guide", content_url: "", is_required: false, order_num: 0, is_published: true };

const CAT_LABELS = { general: "일반", important: "중요", event: "이벤트" };
const CAT_COLORS = {
  general: "bg-blue-500/20 text-blue-400",
  important: "bg-red-500/20 text-red-400",
  event: "bg-yellow-500/20 text-yellow-400",
};
const TARGET_LABELS = { all: "전체", dealer: "대리점", call_team: "콜팀" };
const ACAD_CAT_LABELS = { required: "필수", guide: "가이드", advanced: "심화" };
const ACAD_CAT_COLORS = { required: "bg-red-500/20 text-red-400", guide: "bg-blue-500/20 text-blue-400", advanced: "bg-purple-500/20 text-purple-400" };

/* ── 공지사항 관리 ── */
function NoticePanel() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = new
  const [form, setForm] = useState(EMPTY_NOTICE);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    base44.entities.Notice.list("-created_at", 500).then(setNotices).finally(() => setLoading(false));
  }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY_NOTICE); setShowForm(true); };
  const openEdit = (n) => { setEditing(n.id); setForm({ title: n.title, content: n.content, category: n.category || "general", target: n.target || "all", is_pinned: n.is_pinned || false, is_published: n.is_published !== false }); setShowForm(true); };

  const save = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    const data = { ...form, created_at: editing ? undefined : new Date().toISOString(), created_by: Auth.getDealerName() };
    if (editing) {
      await base44.entities.Notice.update(editing, data);
      setNotices(prev => prev.map(n => n.id === editing ? { ...n, ...data } : n));
    } else {
      const created = await base44.entities.Notice.create(data);
      setNotices(prev => [created, ...prev]);
    }
    setSaving(false);
    setShowForm(false);
  };

  const del = async (id) => {
    setDeleting(id);
    await base44.entities.Notice.delete(id);
    setNotices(prev => prev.filter(n => n.id !== id));
    setDeleting(null);
  };

  const filtered = notices.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = !q || n.title?.toLowerCase().includes(q);
    const matchCat = catFilter === "all" || n.category === catFilter;
    return matchSearch && matchCat;
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white">공지사항 관리</h3>
        <button onClick={openNew} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 transition-all">
          + 공지 작성
        </button>
      </div>

      {showForm && (
        <SFCard>
          <h4 className="text-xs font-semibold text-gray-400 mb-3">{editing ? "공지 수정" : "새 공지 작성"}</h4>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="제목 *"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="내용 *" rows={4}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 resize-none" />
            <div className="flex gap-2 flex-wrap">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">카테고리</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs">
                  {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">대상</label>
                <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs">
                  {Object.entries(TARGET_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3 pb-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))} className="accent-purple-500" />
                  <span className="text-xs text-gray-400">상단 고정</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} className="accent-purple-500" />
                  <span className="text-xs text-gray-400">발행</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.title || !form.content}
                className="px-4 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 disabled:opacity-50">
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs hover:bg-white/10">취소</button>
            </div>
          </div>
        </SFCard>
      )}

      <div className="flex gap-2 flex-wrap">
        {[["all", "전체"], ["important", "중요"], ["general", "일반"], ["event", "이벤트"]].map(([v, l]) => (
          <button key={v} onClick={() => setCatFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${catFilter === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {l}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제목 검색..."
          className="ml-auto bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs placeholder:text-gray-600 w-44" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["제목", "카테고리", "대상", "고정", "발행", "작성일", "액션"].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-600">공지사항 없음</td></tr>
            ) : filtered.map(n => (
              <tr key={n.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-2 text-white font-medium max-w-[200px] truncate">{n.is_pinned ? "📌 " : ""}{n.title}</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${CAT_COLORS[n.category] || "bg-white/10 text-gray-400"}`}>
                    {CAT_LABELS[n.category] || n.category}
                  </span>
                </td>
                <td className="py-3 px-2 text-gray-400">{TARGET_LABELS[n.target] || n.target}</td>
                <td className="py-3 px-2">{n.is_pinned ? <span className="text-red-400">고정</span> : <span className="text-gray-600">-</span>}</td>
                <td className="py-3 px-2">{n.is_published !== false ? <span className="text-emerald-400">발행</span> : <span className="text-gray-600">미발행</span>}</td>
                <td className="py-3 px-2 text-gray-500">{n.created_at?.split("T")[0] || n.created_date?.split("T")[0]}</td>
                <td className="py-3 px-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(n)} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[10px] hover:bg-blue-500/30">수정</button>
                    <button onClick={() => del(n.id)} disabled={deleting === n.id} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 아카데미 콘텐츠 관리 ── */
function AcademyPanel() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ACADEMY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    base44.entities.AcademyContent.list("order_num", 500).then(setContents).finally(() => setLoading(false));
  }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY_ACADEMY); setShowForm(true); };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({ title: c.title, description: c.description || "", category: c.category || "guide", content_url: c.content_url || "", is_required: c.is_required || false, order_num: c.order_num || 0, is_published: c.is_published !== false });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title) return;
    setSaving(true);
    const data = { ...form, created_at: editing ? undefined : new Date().toISOString() };
    if (editing) {
      await base44.entities.AcademyContent.update(editing, data);
      setContents(prev => prev.map(c => c.id === editing ? { ...c, ...data } : c));
    } else {
      const created = await base44.entities.AcademyContent.create(data);
      setContents(prev => [...prev, created].sort((a, b) => (a.order_num || 0) - (b.order_num || 0)));
    }
    setSaving(false);
    setShowForm(false);
  };

  const del = async (id) => {
    setDeleting(id);
    await base44.entities.AcademyContent.delete(id);
    setContents(prev => prev.filter(c => c.id !== id));
    setDeleting(null);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white">아카데미 콘텐츠 관리</h3>
        <button onClick={openNew} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 transition-all">
          + 콘텐츠 추가
        </button>
      </div>

      {showForm && (
        <SFCard>
          <h4 className="text-xs font-semibold text-gray-400 mb-3">{editing ? "콘텐츠 수정" : "새 콘텐츠"}</h4>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="제목 *"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="설명" rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 resize-none" />
            <input value={form.content_url} onChange={e => setForm(p => ({ ...p, content_url: e.target.value }))} placeholder="링크 / 내용 URL"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
            <div className="flex gap-2 flex-wrap">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">카테고리</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs">
                  {Object.entries(ACAD_CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">순서</label>
                <input type="number" value={form.order_num} onChange={e => setForm(p => ({ ...p, order_num: Number(e.target.value) }))}
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs w-20" />
              </div>
              <div className="flex items-end gap-3 pb-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_required} onChange={e => setForm(p => ({ ...p, is_required: e.target.checked }))} className="accent-red-500" />
                  <span className="text-xs text-gray-400">필수 항목</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} className="accent-purple-500" />
                  <span className="text-xs text-gray-400">발행</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.title}
                className="px-4 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 disabled:opacity-50">
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs hover:bg-white/10">취소</button>
            </div>
          </div>
        </SFCard>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {["제목", "카테고리", "필수", "순서", "발행", "액션"].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {contents.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-600">콘텐츠 없음</td></tr>
            ) : contents.map(c => (
              <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-2 text-white font-medium max-w-[200px] truncate">{c.title}</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${ACAD_CAT_COLORS[c.category] || "bg-white/10 text-gray-400"}`}>
                    {ACAD_CAT_LABELS[c.category] || c.category}
                  </span>
                </td>
                <td className="py-3 px-2">{c.is_required ? <span className="text-red-400">필수</span> : <span className="text-gray-600">-</span>}</td>
                <td className="py-3 px-2 text-gray-400">{c.order_num || 0}</td>
                <td className="py-3 px-2">{c.is_published !== false ? <span className="text-emerald-400">발행</span> : <span className="text-gray-600">미발행</span>}</td>
                <td className="py-3 px-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[10px] hover:bg-blue-500/30">수정</button>
                    <button onClick={() => del(c.id)} disabled={deleting === c.id} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 메인 패널 (탭 전환) ── */
export default function ContentManagementPanel() {
  const [tab, setTab] = useState(0);
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {["📢 공지사항", "🎓 아카데미"].map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <NoticePanel />}
      {tab === 1 && <AcademyPanel />}
    </div>
  );
}