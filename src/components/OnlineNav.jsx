import { useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { label: "홈", icon: "🏠", path: "/online/dashboard" },
  { label: "실적", icon: "📊", path: "/online/performance" },
  { label: "DB등록", icon: "📋", path: "/online/register" },
  { label: "광고", icon: "📣", path: "/online/ads" },
  { label: "경쟁", icon: "🏆", path: "/online/competition" },
  { label: "공지", icon: "📢", path: "/notices" },
  { label: "설정", icon: "⚙️", path: "/online/settings" },
];

export default function OnlineNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#080a12] border-t border-white/[0.06] flex">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all ${
              isActive ? "text-emerald-400" : "text-gray-600 hover:text-gray-400"
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className={`text-[9px] font-medium ${isActive ? "text-emerald-400" : "text-gray-600"}`}>
              {item.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-6 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}