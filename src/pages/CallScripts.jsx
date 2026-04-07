import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Plus, Copy, Check, ChevronDown, ChevronUp, X } from "lucide-react";

const CATEGORIES = ["신규고객", "망설이는고객", "비교고객", "리크루팅"];
const SHARED_CATEGORIES = ["첫인사", "거절대응", "관심유도", "마무리"];
const SHARED_CAT_BADGE = {
  첫인사: "bg-blue-500/20 text-blue-400",
  거절대응: "bg-red-500/20 text-red-400",
  관심유도: "bg-yellow-500/20 text-yellow-400",
  마무리: "bg-emerald-500/20 text-emerald-400",
};
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
  const storedUser = JSON.parse(localStorage.getItem('sf_dealer') || '{}');
  const myPosition = storedUser.position || '';
  const canShareScript = myPosition.includes('팀장') || myPosition.includes('지사장') || isAdmin;

  const [sharedScripts, setSharedScripts] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareForm, setShareForm] = useState({ title: '', content: '', category: '첫인사' });
  const [shareSaving, setShareSaving] = useState(false);
  const [likingId, setLikingId] = useState(null);

  const [abTests, setAbTests] = useState([]);
  const [showABModal, setShowABModal] = useState(false);
  const [abForm, setAbForm] = useState({ title_a: '', content_a: '', title_b: '', content_b: '', ab_group_id: '' });
  const [abSaving, setAbSaving] = useState(false);

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
    loadSharedScripts();
    loadABTests();
  }, []);

  const loadSharedScripts = async () => {
    const data = await base44.entities.CallScript.list('-created_at', 200);
    setSharedScripts(data.filter(s => s.is_shared));
  };

  const loadABTests = async () => {
    const data = await base44.entities.CallScript.list('-created_at', 500);
    const abList = data.filter(s => s.is_ab_test);
    setAbTests(abList);
  };

  const saveABTest = async () => {
    if (!abForm.title_a || !abForm.content_a || !abForm.title_b || !abForm.content_b || !abForm.ab_group_id) return;
    setAbSaving(true);
    const groupId = abForm.ab_group_id;
    await Promise.all([
      base44.entities.CallScript.create({
        title: abForm.title_a,
        content: abForm.content_a,
        category: '첫인사',
        is_ab_test: true,
        ab_group_id: groupId,
        ab_variant: 'A',
        success_count: 0,
        usage_count: 0,
        is_active: true,
        created_by: storedUser.username || me,
        created_at: new Date().toISOString(),
      }),
      base44.entities.CallScript.create({
        title: abForm.title_b,
        content: abForm.content_b,
        category: '첫인사',
        is_ab_test: true,
        ab_group_id: groupId,
        ab_variant: 'B',
        success_count: 0,
        usage_count: 0,
        is_active: true,
        created_by: storedUser.username || me,
        created_at: new Date().toISOString(),
      }),
    ]);
    await loadABTests();
    setAbForm({ title_a: '', content_a: '', title_b: '', content_b: '', ab_group_id: '' });
    setShowABModal(false);
    setAbSaving(false);
  };

  const saveShared = async () => {
    if (!shareForm.title || !shareForm.content) return;
    setShareSaving(true);
    const created = await base44.entities.CallScript.create({
      ...shareForm,
      is_shared: true,
      is_active: true,
      author: storedUser.name || me,
      position: myPosition,
      likes: 0,
      created_by: storedUser.username || me,
      created_at: new Date().toISOString(),
    });
    setSharedScripts(prev => [created, ...prev]);
    setShareForm({ title: '', content: '', category: '첫인사' });
    setShowShareModal(false);
    setShareSaving(false);
  };

  const handleLike = async (s) => {
    if (likingId === s.id) return;
    setLikingId(s.id);
    const newLikes = (s.likes || 0) + 1;
    await base44.entities.CallScript.update(s.id, { likes: newLikes });
    setSharedScripts(prev => prev.map(x => x.id === s.id ? { ...x, likes: newLikes } : x));
    setLikingId(null);
  };

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
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">

        {/* A/B 테스트 */}
        {abTests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">🧪 A/B 테스트</h2>
              {(myPosition.includes('팀장') || myPosition.includes('지사장') || isAdmin) && (
                <button onClick={() => setShowABModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30 transition-all">
                  <Plus className="h-3.5 w-3.5" /> A/B 테스트 등록
                </button>
              )}
            </div>
            <ABTestSection abTests={abTests} setAbTests={setAbTests} />
          </div>
        )}

        {/* A/B 테스트 등록 모달 */}
        {showABModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <SFCard className="w-full max-w-lg border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">A/B 테스트 등록</h3>
                <button onClick={() => setShowABModal(false)}><X className="h-4 w-4 text-gray-500" /></button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <div>
                  <label className="text-[10px] text-gray-400">그룹 ID *</label>
                  <input value={abForm.ab_group_id} onChange={e => setAbForm(p => ({ ...p, ab_group_id: e.target.value }))}
                    placeholder="예: test_001" className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400">Script A 제목 *</label>
                    <input value={abForm.title_a} onChange={e => setAbForm(p => ({ ...p, title_a: e.target.value }))}
                      className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Script B 제목 *</label>
                    <input value={abForm.title_b} onChange={e => setAbForm(p => ({ ...p, title_b: e.target.value }))}
                      className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Script A 내용 *</label>
                  <textarea value={abForm.content_a} onChange={e => setAbForm(p => ({ ...p, content_a: e.target.value }))}
                    rows={4} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Script B 내용 *</label>
                  <textarea value={abForm.content_b} onChange={e => setAbForm(p => ({ ...p, content_b: e.target.value }))}
                    rows={4} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveABTest} disabled={abSaving || !abForm.title_a || !abForm.content_a || !abForm.title_b || !abForm.content_b || !abForm.ab_group_id}
                  className="px-5 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-blue-500/30 transition-all">
                  {abSaving ? '저장 중...' : 'A/B 테스트 시작'}
                </button>
                <button onClick={() => setShowABModal(false)} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs">취소</button>
              </div>
            </SFCard>
          </div>
        )}

        {/* 팀 공유 스크립트 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">👥 팀 공유 스크립트</h2>
            {canShareScript && (
              <button onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 transition-all">
                <Plus className="h-3.5 w-3.5" /> 공유 등록
              </button>
            )}
          </div>
          {sharedScripts.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-6 bg-white/[0.02] rounded-xl">공유된 스크립트가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {sharedScripts.map(s => (
                <SFCard key={s.id}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{s.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${SHARED_CAT_BADGE[s.category] || 'bg-white/5 text-gray-400'}`}>{s.category}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{s.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                        <span>{s.author || s.created_by}</span>
                        {s.position && <span className="bg-white/5 px-1.5 py-0.5 rounded">{s.position}</span>}
                        <span>{(s.created_at || '').substring(0, 10)}</span>
                      </div>
                    </div>
                    <button onClick={() => handleLike(s)} disabled={likingId === s.id}
                      className="shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-all disabled:opacity-50">
                      <span className="text-sm">👍</span>
                      <span className="text-[10px] font-bold">{s.likes || 0}</span>
                    </button>
                  </div>
                </SFCard>
              ))}
            </div>
          )}
        </div>

        {/* 공유 등록 모달 */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <SFCard className="w-full max-w-md border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">팀 공유 스크립트 등록</h3>
                <button onClick={() => setShowShareModal(false)}><X className="h-4 w-4 text-gray-500" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-400">제목 *</label>
                  <input value={shareForm.title} onChange={e => setShareForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">카테고리</label>
                  <select value={shareForm.category} onChange={e => setShareForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    {SHARED_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">내용 *</label>
                  <textarea value={shareForm.content} onChange={e => setShareForm(p => ({ ...p, content: e.target.value }))}
                    rows={5} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-y" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveShared} disabled={shareSaving || !shareForm.title || !shareForm.content}
                  className="px-5 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-purple-500/30 transition-all">
                  {shareSaving ? '저장 중...' : '공유 등록'}
                </button>
                <button onClick={() => setShowShareModal(false)} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs">취소</button>
              </div>
            </SFCard>
          </div>
        )}

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

function ABTestSection({ abTests, setAbTests }) {
  const grouped = {};
  abTests.forEach(s => {
    const gid = s.ab_group_id;
    if (!grouped[gid]) grouped[gid] = [];
    grouped[gid].push(s);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([groupId, scripts]) => {
        const scriptA = scripts.find(s => s.ab_variant === 'A');
        const scriptB = scripts.find(s => s.ab_variant === 'B');
        if (!scriptA || !scriptB) return null;

        const rateA = scriptA.usage_count > 0 ? ((scriptA.success_count / scriptA.usage_count) * 100).toFixed(1) : 0;
        const rateB = scriptB.usage_count > 0 ? ((scriptB.success_count / scriptB.usage_count) * 100).toFixed(1) : 0;
        const isAWinner = parseFloat(rateA) > parseFloat(rateB);

        return (
          <div key={groupId} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-3">그룹: {groupId}</p>
            <div className="grid grid-cols-2 gap-4">
              {[scriptA, scriptB].map((s, idx) => {
                const variant = s.ab_variant;
                const rate = variant === 'A' ? rateA : rateB;
                const isWinner = variant === 'A' ? isAWinner : !isAWinner;
                const hasData = s.usage_count > 0;

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      hasData && isWinner
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-white/[0.02] border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-sm font-bold text-white">Script {variant}</span>
                        <p className="text-xs text-gray-400 mt-1">{s.title}</p>
                      </div>
                      {hasData && isWinner && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg font-semibold">🏆 승자</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-3 mb-3 leading-relaxed">{s.content}</p>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex justify-between text-gray-400">
                        <span>사용: {s.usage_count || 0}회</span>
                        <span>성공: {s.success_count || 0}회</span>
                      </div>
                      <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            hasData && isWinner ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(parseFloat(rate), 100)}%` }}
                        />
                      </div>
                      <p className={`font-bold ${
                        hasData && isWinner ? 'text-emerald-400' : 'text-blue-400'
                      }`}>
                        전환율: {rate}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}