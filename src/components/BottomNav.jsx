import { useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, UserPlus, FileText, Calendar, Trophy, GraduationCap, Bell } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { path: "/register", icon: UserPlus, label: "등록" },
  { path: "/records", icon: FileText, label: "매출" },
  { path: "/daily", icon: Calendar, label: "일자별" },
  { path: "/ranking", icon: Trophy, label: "랭킹" },
  { path: "/academy", icon: GraduationCap, label: "학습" },
  { path: "/notices", icon: Bell, label: "공지" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#080a12]/95 backdrop-blur-xl">
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all min-w-[40px] ${
                active
                  ? "text-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={active ? 2.5 : 1.5} style={{ width: 18, height: 18 }} />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
              {active && (
                <div className="h-0.5 w-4 rounded-full bg-blue-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}