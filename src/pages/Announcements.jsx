import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import SFCard from "../components/SFCard";
import { ArrowLeft, Bell, ChevronDown, ChevronUp } from "lucide-react";

const CAT_CONFIG = {
  important: { label: "중요", emoji: "🔴", color: "bg-red-500/20 text-red-400" },
  event: { label: "이벤트", emoji: "🟡", color: "bg-yellow-500/20 text-yellow-400" },
  general: { label: "일반", emoji: "⚪", color: "bg-white/10 text-gray-400" },
};

export default function Announcements() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    base44.entities.Notice.list("-created_at", 200).then(all => {
      const role = Auth.getRole();
      const filtered = all.filter(n =>
        n.is_published !== false &&
        (n.target === "all" || n.target === role)
      ).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      setNotices(filtered);
    }).finally(() => setLoading(false));
  }, []);

  const toggle = async (id) => {
    const isOpening = !expanded[id];
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    
    if (isOpening) {
      try {
        const username = Auth.getDealerName();
        const role = Auth.getRole();
        const existing = await base44.entities.NoticeReadLog.filter({
          notice_id: id,
          reader_username: username,
        });
        if (!existing || existing.length === 0) {
          await base44.entities.NoticeReadLog.create({
            notice_id: id,
            reader_name: Auth.getDealerName(),
            reader_username: username,
            reader_role: role,
            read_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Failed to log notice read:", e);
      }
    }
  };

  const pinnedNotices = notices.filter(n => n.is_pinned);
  const regularNotices = notices.filter(n => !n.is_pinned);

  const renderNotice = (notice) => {
    const cat = CAT_CONFIG[notice.category] || CAT_CONFIG.general;
    return (
      <SFCard key={notice.id} className={notice.is_pinned ? "border border-purple-500/20" : ""}>
        <button onClick={() => toggle(notice.id)} className="w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {notice.is_pinned && <span className="text-[10px] text-purple-400">📌 고정</span>}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.color}`}>
                  {cat.emoji} {cat.label}
                </span>
              </div>
              <p className="text-sm font-medium text-white mt-1.5">{notice.title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {notice.created_at?.split("T")[0] || notice.created_date?.split("T")[0]}
              </p>
            </div>
            {expanded[notice.id]
              ? <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 mt-1" />
              : <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 mt-1" />}
          </div>
          {expanded[notice.id] && (
            <p className="text-xs text-gray-400 mt-3 leading-relaxed border-t border-white/[0.06] pt-3 whitespace-pre-wrap">
              {notice.content}
            </p>
          )}
        </button>
      </SFCard>
    );
  };

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <h1 className="text-base font-bold text-white">공지사항</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">등록된 공지사항이 없습니다</p>
          </div>
        ) : (
          <>
            {pinnedNotices.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-white">📌 고정 공지</h2>
                {pinnedNotices.map(renderNotice)}
              </div>
            )}
            {regularNotices.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-white">📢 전체 공지</h2>
                {regularNotices.map(renderNotice)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}