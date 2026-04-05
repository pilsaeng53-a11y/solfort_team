import { useState, useEffect } from "react";
import { Auth } from "@/lib/auth";
import SFLogo from "./SFLogo";
import NotificationCenter from "./NotificationCenter";
import { LogOut } from "lucide-react";

export default function AdminHeader({ title, accent = "blue" }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const accentClass = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
  }[accent] || "text-blue-400";

  const fmt = now.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-white/[0.06] bg-[#080a12] sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <SFLogo size="sm" />
        <div>
          <h1 className={`text-base font-bold ${accentClass}`}>{title}</h1>
          <p className="text-[10px] text-gray-500">{fmt}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationCenter />
        <button
          onClick={Auth.logout}
          className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          로그아웃
        </button>
      </div>
    </div>
  );
}