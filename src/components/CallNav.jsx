import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "@/lib/auth";
import SFLogo from "./SFLogo";
import { LogOut } from "lucide-react";

const NAV_ITEMS = [
  { path: "/call/dashboard", label: "콜 대시보드" },
  { path: "/call/leads", label: "고객 리드" },
  { path: "/call/queue", label: "콜 큐" },
  { path: "/call/logs", label: "콜 기록" },
  { path: "/call/interest", label: "관심 고객" },
  { path: "/call/convert", label: "매입 연결" },
  { path: "/call/scripts", label: "콜 스크립트" },
  { path: "/call/ai", label: "AI 영업 도우미" },
];

export default function CallNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = now.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="sticky top-0 z-30 bg-[#080a12] border-b border-white/[0.06]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SFLogo size="sm" />
          <div>
            <p className="text-xs font-bold text-white leading-tight">콜팀 운영센터</p>
            <p className="text-[10px] text-gray-500">{Auth.getDealerName()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-[10px] text-gray-500">{fmt}</span>
          <button
            onClick={Auth.logout}
            className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-all"
          >
            <LogOut className="h-3 w-3" /> 로그아웃
          </button>
        </div>
      </div>
      {/* Tab nav */}
      <div className="flex overflow-x-auto gap-0.5 px-3 pb-0 scrollbar-hide">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`shrink-0 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                active
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}