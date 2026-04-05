import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SFCard from "../components/SFCard";
import { ArrowLeft, Bell, Pin, Archive, ChevronDown, ChevronUp } from "lucide-react";

const NOTICES = {
  latest: [
    { id: 1, title: "2026년 4월 프로모션 변경 안내", date: "2026-04-01", content: "4월부터 400% 프로모션 대상 대리점이 확대됩니다. GOLD 등급 이상 대리점은 자동 적용됩니다.", tag: "프로모션" },
    { id: 2, title: "USDT 환율 정책 업데이트", date: "2026-03-28", content: "실시간 환율 소스가 업데이트되었습니다. 기존 수동 입력을 사용하시는 대리점은 자동 환율로 전환을 권장합니다.", tag: "환율" },
    { id: 3, title: "신규 대리점 온보딩 가이드 배포", date: "2026-03-25", content: "신규 대리점을 위한 온보딩 가이드가 배포되었습니다. 아카데미 > 필수 진행 항목에서 확인하세요.", tag: "가이드" },
  ],
  important: [
    { id: 4, title: "⚠️ 중복 등록 패널티 강화", date: "2026-03-15", content: "동일 고객 중복 등록 시 리베이트가 차감됩니다. 등록 전 고객 조회를 반드시 진행해 주세요.", tag: "정책", pinned: true },
    { id: 5, title: "⚠️ 지갑 보안 강화 안내", date: "2026-03-10", content: "최근 피싱 사례가 증가하고 있습니다. 지갑 개인키 및 시드구문을 절대 공유하지 마세요.", tag: "보안", pinned: true },
  ],
  archived: [
    { id: 6, title: "2026년 2월 매출 정산 완료", date: "2026-03-05", content: "2월 매출 리베이트가 정산되었습니다.", tag: "정산" },
    { id: 7, title: "시스템 점검 안내 (완료)", date: "2026-02-28", content: "서버 점검이 완료되었습니다.", tag: "시스템" },
  ],
};

const TAG_COLORS = {
  프로모션: "bg-purple-500/20 text-purple-400",
  환율: "bg-green-500/20 text-green-400",
  가이드: "bg-blue-500/20 text-blue-400",
  정책: "bg-red-500/20 text-red-400",
  보안: "bg-orange-500/20 text-orange-400",
  정산: "bg-yellow-500/20 text-yellow-400",
  시스템: "bg-gray-500/20 text-gray-400",
};

export default function Announcements() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderNotice = (notice) => (
    <SFCard key={notice.id}>
      <button onClick={() => toggle(notice.id)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {notice.pinned && <Pin className="h-3 w-3 text-red-400" />}
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${TAG_COLORS[notice.tag] || "bg-white/10 text-gray-400"}`}>
                {notice.tag}
              </span>
            </div>
            <p className="text-sm font-medium text-white mt-1.5">{notice.title}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{notice.date}</p>
          </div>
          {expanded[notice.id] ? (
            <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 mt-1" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 mt-1" />
          )}
        </div>
        {expanded[notice.id] && (
          <p className="text-xs text-gray-400 mt-3 leading-relaxed border-t border-white/[0.06] pt-3">
            {notice.content}
          </p>
        )}
      </button>
    </SFCard>
  );

  const sections = [
    { key: "latest", title: "📢 최신 공지", icon: Bell, data: NOTICES.latest },
    { key: "important", title: "🚨 중요 공지", icon: Pin, data: NOTICES.important },
    { key: "archived", title: "📁 공지 보관함", icon: Archive, data: NOTICES.archived },
  ];

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <h1 className="text-base font-bold text-white">공지사항</h1>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.key} className="space-y-3">
            <h2 className="text-sm font-semibold text-white">{section.title}</h2>
            {section.data.map(renderNotice)}
          </div>
        ))}
      </div>
    </div>
  );
}