import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import SFCard from "@/components/SFCard";
import { X, Download } from "lucide-react";

const TABS = [
  { id: "all", label: "전체공지", target: "전체" },
  { id: "dealer", label: "대리점공지", target: "대리점" },
  { id: "call", label: "콜팀공지", target: "콜팀" },
  { id: "online", label: "온라인팀공지", target: "온라인팀" },
  { id: "materials", label: "📁영업자료", target: "영업자료" },
];

export default function Notices() {
  const [activeTab, setActiveTab] = useState("all");
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [teams, setTeams] = useState([]);
  const [regions, setRegions] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    target: "전체공지",
    specificTeams: [],
    is_important: false,
    file_url: "",
  });

  useEffect(() => {
    const initUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        await loadTeamsAndRegions();
      } catch {}
    };
    initUser();
  }, []);

  const loadTeamsAndRegions = async () => {
    try {
      const [callMembers, dealers] = await Promise.all([
        base44.entities.CallTeamMember.list("-created_date", 500),
        base44.entities.DealerInfo.list("-created_date", 500),
      ]);
      const teamNames = [...new Set(callMembers.map(m => m.team).filter(Boolean))];
      const regionNames = [...new Set(dealers.map(d => d.region).filter(Boolean))];
      setTeams(teamNames);
      setRegions(regionNames);
    } catch (e) {}
  };

  useEffect(() => {
    loadNotices();
  }, [activeTab, user]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const allNotices = await base44.entities.Notice.list("-created_date", 200);
      let filtered = allNotices;
      
      if (user?.role === "dealer") {
        filtered = allNotices.filter(n => n.target === "전체공지" || n.target === "대리점만");
      } else if (user?.role === "call_team") {
        filtered = allNotices.filter(n => n.target === "전체공지" || n.target === "콜팀만");
      } else if (user?.role === "online_team") {
        filtered = allNotices.filter(n => n.target === "전체공지" || n.target === "온라인팀만");
      }
      setNotices(filtered);
    } catch (e) {
      setNotices([]);
    }
    setLoading(false);
  };

  const handleCreateNotice = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      const targetMap = { "전체공지": "전체", "대리점만": "대리점", "콜팀만": "콜팀", "온라인팀만": "온라인팀" };
      const target = formData.target === "특정팀선택" ? "특정팀: " + formData.specificTeams.join(", ") : targetMap[formData.target];
      
      await base44.entities.Notice.create({
        title: formData.title,
        content: formData.content,
        target: target,
        is_pinned: formData.is_important,
        is_published: true,
        category: isMaterialsTab ? "important" : "general",
        file_url: formData.file_url || null,
        created_by: user?.email || user?.username,
      });

      if (formData.target === "특정팀선택" && formData.specificTeams.length > 0) {
        const preview = formData.content.length > 50 ? formData.content.substring(0, 50) + "..." : formData.content;
        const msg = `📢 ${formData.specificTeams.join(", ")} 공지\n제목: ${formData.title}\n${preview}`;
        await sendTelegram(msg);
      }

      setFormData({ title: "", content: "", target: "전체공지", specificTeams: [], is_important: false, file_url: "" });
      setShowModal(false);
      loadNotices();
    } catch (e) {
      alert("공지 등록에 실패했습니다.");
    }
  };

  const sendTelegram = async (message) => {
    try {
      const BOT_TOKEN = '8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8';
      const CHAT_ID = '5757341051';
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
      });
    } catch (e) {}
  };

  const getTargetBadgeColor = (target) => {
    if (target === "전체") return "bg-gray-500/20 text-gray-400";
    if (target === "대리점") return "bg-emerald-500/20 text-emerald-400";
    if (target === "콜팀") return "bg-blue-500/20 text-blue-400";
    if (target === "온라인팀") return "bg-purple-500/20 text-purple-400";
    if (target?.startsWith("특정팀")) return "bg-yellow-500/20 text-yellow-400";
    return "bg-emerald-500/20 text-emerald-400";
  };

  const isSuperAdmin = user?.role === "super_admin";
  const target = TABS.find(t => t.id === activeTab)?.target || "전체";
  const isMaterialsTab = activeTab === "materials";

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Header */}
      <div className="border-b border-white/[0.06] sticky top-0 z-10 bg-[#080a12]/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">공지사항</h1>
            {isSuperAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all"
              >
                {isMaterialsTab ? "📄 영업자료 등록" : "✏️ 공지 작성"}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">등록된 {isMaterialsTab ? "자료" : "공지"}가 없습니다</p>
          </div>
        ) : isMaterialsTab ? (
          // Materials View
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map(notice => (
              <SFCard key={notice.id} className="border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <div className="flex gap-4">
                  <div className="text-4xl">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{notice.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notice.content}</p>
                    {notice.file_url && (
                      <a
                        href={notice.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 transition-all"
                      >
                        <Download className="h-3 w-3" />
                        다운로드
                      </a>
                    )}
                  </div>
                </div>
              </SFCard>
            ))}
          </div>
        ) : (
          // Notice Cards View
          <div className="space-y-3">
            {notices.map(notice => (
              <SFCard
                key={notice.id}
                className={`border cursor-pointer transition-all ${
                  expandedId === notice.id
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-emerald-500/20 hover:border-emerald-500/40"
                }`}
                onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
              >
                <div className="flex items-start gap-3">
                  {notice.is_pinned && <span className="text-sm">🔴</span>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <p className="text-white font-semibold">{notice.title}</p>
                           {notice.target && notice.target !== "전체" && (
                             <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${getTargetBadgeColor(notice.target)}`}>
                               {notice.target.startsWith("특정팀") ? "특정팀" : notice.target}
                             </span>
                           )}
                    </div>
                    {!expandedId ? (
                      <p className="text-xs text-gray-500 line-clamp-2">{notice.content}</p>
                    ) : (
                      <p className="text-sm text-gray-300 whitespace-pre-wrap mt-3">{notice.content}</p>
                    )}
                    <div className="flex gap-4 text-[10px] text-gray-600 mt-3">
                      <span>{notice.created_by}</span>
                      <span>{(notice.created_at || "").split("T")[0]}</span>
                    </div>
                  </div>
                </div>
              </SFCard>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <SFCard className="max-w-md w-full border border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {isMaterialsTab ? "영업자료 등록" : "공지 작성"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">제목 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="제목"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">내용 *</label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
                  placeholder="내용"
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {isMaterialsTab ? (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">카테고리</label>
                  <select
                    value={formData.target}
                    onChange={e => setFormData(p => ({ ...p, target: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                  >
                    {["전체공지", "대리점만", "콜팀만", "온라인팀만", "특정팀선택"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">대상</label>
                  <select
                    value={formData.target}
                    onChange={e => setFormData(p => ({ ...p, target: e.target.value, specificTeams: [] }))}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                  >
                    {["전체공지", "대리점만", "콜팀만", "온라인팀만", "특정팀선택"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.target === "특정팀선택" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-2">팀 선택</label>
                  <div className="space-y-2">
                    {teams.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">콜팀</p>
                        <div className="grid grid-cols-2 gap-2">
                          {teams.map(t => (
                            <label key={t} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.specificTeams.includes(t)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setFormData(p => ({ ...p, specificTeams: [...p.specificTeams, t] }));
                                  } else {
                                    setFormData(p => ({ ...p, specificTeams: p.specificTeams.filter(x => x !== t) }));
                                  }
                                }}
                                className="w-3 h-3 rounded accent-emerald-500"
                              />
                              <span className="text-xs text-gray-300">{t}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {regions.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">지역</p>
                        <div className="grid grid-cols-2 gap-2">
                          {regions.map(r => (
                            <label key={r} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.specificTeams.includes(r)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setFormData(p => ({ ...p, specificTeams: [...p.specificTeams, r] }));
                                  } else {
                                    setFormData(p => ({ ...p, specificTeams: p.specificTeams.filter(x => x !== r) }));
                                  }
                                }}
                                className="w-3 h-3 rounded accent-emerald-500"
                              />
                              <span className="text-xs text-gray-300">{r}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isMaterialsTab && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_important}
                    onChange={e => setFormData(p => ({ ...p, is_important: e.target.checked }))}
                    className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-emerald-500"
                  />
                  <span className="text-xs text-gray-400">중요공지</span>
                </label>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-1">파일 URL (선택)</label>
                <input
                  type="text"
                  value={formData.file_url}
                  onChange={e => setFormData(p => ({ ...p, file_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreateNotice}
                  className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all"
                >
                  등록
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-white/5 text-gray-400 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          </SFCard>
        </div>
      )}
    </div>
  );
}