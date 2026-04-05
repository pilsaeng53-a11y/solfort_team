import { Auth } from "@/lib/auth";
import SFLogo from "../components/SFLogo";
import { Phone, LogOut } from "lucide-react";

export default function CallTeam() {
  return (
    <div className="min-h-screen bg-[#080a12] flex flex-col items-center justify-center px-4 gap-6">
      <SFLogo size="lg" />
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Phone className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white">콜영업팀 대시보드</h1>
        </div>
        <p className="text-sm text-gray-500">준비 중입니다</p>
      </div>
      <button
        onClick={Auth.logout}
        className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all"
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </button>
    </div>
  );
}