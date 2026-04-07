import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "전체",
    is_important: false,
    file_url: "",
  });

  useEffect(() => {
    const initUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch {}
    };
    initUser();
  }, []);

  useEffect(() => {
    loadNotices();
  }, [activeTab]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const target = TABS.find(t => t.id === activeTab)?.target || "전체";
      const allNotices = await base44.entities.Notice.list("-created_date", 200);
      const filtered = target === "전체" 
        ? allNotices 
        : allNotices.filter(n => n.target === target);
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
      await base44.entities.Notice.create({
        title: formData.title,
        content: formData.content,
        target: formData.category,
        is_pinned: formData.is_important,
        is_published: true,
        category: formData.category === "영업자료" ? "important" : "general",
        file_url: formData.file_url || null,
        created_by: user?.email || user?.username,
      });
      setFormData({ title: "", content: "", category: "전체", is_important: false, file_url: "" });
      setShowModal(false);
      loadNotices();
    } catch (e) {
      alert("공지 등록에 실패했습니다.");
    }
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
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                          {notice.target}
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

              <div>
                <label className="text-xs text-gray-400 block mb-1">카테고리</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                >
                  {["전체", "대리점", "콜팀", "온라인팀", "영업자료"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

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