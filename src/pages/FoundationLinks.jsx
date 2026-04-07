import { useState, useEffect } from "react";
import SFCard from "@/components/SFCard";
import { ExternalLink } from "lucide-react";

const LINKS = [
  {
    icon: "🏛️",
    name: "SolFort Foundation",
    url: "https://solfort.foundation",
    label: "재단 메인페이지",
    description: "솔포트 재단 공식 홈페이지",
    gradient: "from-emerald-500/30 to-blue-500/30",
    border: "border-emerald-500/30",
  },
  {
    icon: "🌐",
    name: "SolFort.io",
    url: "https://solfort.io",
    label: "재단 공식 사이트",
    description: "솔포트 공식 웹사이트",
    gradient: "from-blue-500/30 to-purple-500/30",
    border: "border-blue-500/30",
  },
  {
    icon: "📈",
    name: "SofDex.io",
    url: "https://sofdex.io",
    label: "SOF 거래소",
    description: "솔포트 공식 거래소 플랫폼",
    gradient: "from-purple-500/30 to-pink-500/30",
    border: "border-purple-500/30",
  },
];

export default function FoundationLinks() {
  const [sofPrice, setSofPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder SOF price - would fetch from exchange API
    setTimeout(() => {
      setSofPrice({
        price: 125.45,
        change24h: 2.34,
        volume: "15.2M",
      });
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">SolFort 생태계</h1>
        <p className="text-sm text-gray-500">솔포트 공식 플랫폼과 거래소 바로가기</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8 space-y-8">
        {/* Link Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LINKS.map((link, i) => (
            <SFCard
              key={i}
              className={`bg-gradient-to-br ${link.gradient} border ${link.border} hover:border-opacity-100 transition-all overflow-hidden group`}
            >
              <div className="space-y-4">
                {/* Icon */}
                <div className="text-6xl">{link.icon}</div>

                {/* Title & Label */}
                <div>
                  <h3 className="text-lg font-bold text-white">{link.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{link.label}</p>
                </div>

                {/* URL */}
                <p className="text-xs text-gray-500 font-mono break-all">{link.url}</p>

                {/* Description */}
                <p className="text-sm text-gray-300">{link.description}</p>

                {/* Button */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all group-hover:gap-3"
                >
                  바로가기 <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </SFCard>
          ))}
        </div>

        {/* SOF Price Card */}
        <SFCard className="border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <div className="flex items-center gap-6">
            <div className="text-5xl">💰</div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">현재 SOF 가격</p>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-white">${sofPrice.price.toFixed(2)}</p>
                  <p className={`text-sm mt-1 ${sofPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {sofPrice.change24h >= 0 ? "+" : ""}{sofPrice.change24h.toFixed(2)}% (24h)
                  </p>
                  <p className="text-xs text-gray-500 mt-2">거래량: {sofPrice.volume}</p>
                </>
              )}
            </div>
            <a
              href="https://sofdex.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-all whitespace-nowrap"
            >
              SofDex에서 거래
            </a>
          </div>
        </SFCard>
      </div>
    </div>
  );
}