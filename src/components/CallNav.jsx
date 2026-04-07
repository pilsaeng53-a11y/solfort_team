import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "@/lib/auth";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  // Row 1
  [
    { icon: "🏠", label: "홈", path: "/call/dashboard" },
    { icon: "📋", label: "리드", path: "/call/leads" },
    { icon: "🌲", label: "조직도", path: "/my-network" },
    { icon: "📢", label: "공지", path: "/notices" },
  ],
  // Row 2
  [
    { icon: "📝", label: "일지", path: "/daily-journal" },
    { icon: "🔑", label: "추천코드", path: "/referral-code" },
    { icon: "⚙️", label: "더보기", action: "drawer" },
  ],
];

const DRAWER_ITEMS = [
  { icon: "👥", label: "팀관리", path: "/team-management", roles: ["지사장", "팀장"] },
  { icon: "💰", label: "인센티브", path: "/incentive-settings" },
  { icon: "📜", label: "스크립트", path: "/call/scripts" },
  { icon: "📥", label: "리드업로드", path: "/lead-upload" },
  { icon: "⏱️", label: "출퇴근", action: "attendance" },
];

export default function CallNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stored = JSON.parse(localStorage.getItem("sf_dealer") || "{}");
  const position = stored.position || "";

  const handleNavClick = (item) => {
    if (item.action === "drawer") {
      setDrawerOpen(true);
    } else if (item.path) {
      navigate(item.path);
      setDrawerOpen(false);
    }
  };

  const canAccessTeamMgmt = position.includes("지사장") || position.includes("팀장");

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Navigation Grid */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#080a12] border-t border-white/[0.06] px-4 py-3 z-40">
        <div className="max-w-6xl mx-auto space-y-2">
          {NAV_ITEMS.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-4 gap-2">
              {row.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-[10px] font-medium transition-all ${
                    item.path && isActive(item.path)
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span className="text-lg mb-0.5">{item.icon}</span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Side Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-64 bg-[#0a0c15] border-l border-white/[0.06] z-50 transform transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white">더 보기</h2>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1 hover:bg-white/10 rounded transition-all"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-80px)]">
          {DRAWER_ITEMS.map((item) => {
            const canAccess =
              !item.roles || item.roles.some((r) => position.includes(r));

            if (!canAccess) return null;

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  item.path && isActive(item.path)
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}