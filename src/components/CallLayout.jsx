import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Auth } from "@/lib/auth";
import {
  LayoutDashboard, Users, Phone, Star, TrendingUp, FileText, Bot, LogOut
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/call/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { path: "/call/leads", icon: Users, label: "고객 리드" },
  { path: "/call/logs", icon: Phone, label: "콜 기록" },
  { path: "/call/interest", icon: Star, label: "관심 고객" },
  { path: "/call/convert", icon: TrendingUp, label: "매출 연결" },
  { path: "/call/scripts", icon: FileText, label: "스크립트" },
  { path: "/call/ai", icon: Bot, label: "AI 도우미" },
];

export default function CallLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080a12] flex">
      {/* Side nav - hidden on mobile, show top nav */}
      <aside className="hidden md:flex flex-col w-48 border-r border-white/[0.06] bg-[#080a12] sticky top-0 h-screen">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">📞</div>
            <div>
              <p className="text-xs font-bold text-white">콜영업팀</p>
              <p className="text-[10px] text-gray-500">{Auth.getDealerName()}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${active ? "bg-emerald-500/20 text-emerald-400" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"}`}>
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <button onClick={Auth.logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="h-3.5 w-3.5" /> 로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top nav */}
        <div className="md:hidden flex overflow-x-auto gap-1 px-3 py-2 border-b border-white/[0.06] bg-[#080a12] sticky top-0 z-20">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-500"}`}>
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}