import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const MAIN_ITEMS = [
  { icon: "🏠", label: "홈", path: "/dashboard" },
  { icon: "👥", label: "고객", path: "/records" },
  { icon: "📊", label: "매출", path: "/daily" },
  { icon: "📢", label: "공지", path: "/notices" },
  { icon: "⚙️", label: "더보기", action: "drawer" },
];

const DRAWER_ITEMS = [
  { icon: "🌐", label: "재단", path: "/foundation" },
  { icon: "📝", label: "일지", path: "/daily-journal" },
  { icon: "🏆", label: "경쟁", path: "/ranking" },
  { icon: "🌐", label: "네트워크", path: "/my-network" },
  { icon: "💰", label: "인센티브", path: "/incentive-settings" },
  { icon: "📁", label: "업로드", path: "/lead-upload" },
  { icon: "📋", label: "계약서", path: "/register-customer" },
  { icon: "👤", label: "계정", path: "/account" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleItemClick = (item) => {
    if (item.action === "drawer") {
      setDrawerOpen(true);
    } else if (item.path) {
      navigate(item.path);
      setDrawerOpen(false);
    }
  };

  return (
    <>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#080a12] border-t border-white/[0.06] z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="grid grid-cols-5 gap-2">
            {MAIN_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
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
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-up Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-[#0a0c15] border-t border-white/[0.06] z-50 transform transition-transform duration-300 ${
          drawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "70vh" }}
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

        {/* Drawer Grid */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(70vh - 60px)" }}>
          <div className="grid grid-cols-4 gap-3">
            {DRAWER_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className={`flex flex-col items-center justify-center py-3 rounded-lg text-[10px] font-medium transition-all ${
                  isActive(item.path)
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}