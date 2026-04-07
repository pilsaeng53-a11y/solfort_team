import { useState, useEffect } from "react";
import { Auth } from "@/lib/auth";
import SFLogo from "./SFLogo";
import NotificationCenter from "./NotificationCenter";
import { LogOut, Moon, Sun } from "lucide-react";

export default function AdminHeader({ title, accent = "blue" }) {
  const [now, setNow] = useState(new Date());
  const [theme, setTheme] = useState(() => localStorage.getItem('sf_theme') || 'dark');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('sf_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  };

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
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
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