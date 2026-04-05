import { RefreshCw } from "lucide-react";

export default function UsdtBanner({ rate, source, loading, onRefresh }) {
  return (
    <div className="sf-card rounded-xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold">
          ₮
        </div>
        <div>
          <p className="text-xs text-gray-500">USDT/KRW 환율</p>
          <p className="text-white font-semibold">
            {loading ? "로딩중..." : `₩${rate?.toLocaleString()}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {source && (
          <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
            {source}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}