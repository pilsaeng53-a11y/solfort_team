import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/neonClient";
import SFCard from "../components/SFCard";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

const CAT_CONFIG = {
  required: { label: "필수", color: "bg-red-500/20 text-red-400", icon: "🔴" },
  guide: { label: "가이드", color: "bg-blue-500/20 text-blue-400", icon: "📘" },
  advanced: { label: "심화", color: "bg-purple-500/20 text-purple-400", icon: "🔷" },
};

export default function Academy() {
  const navigate = useNavigate();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AcademyContent.list("order_num", 500).then(all => {
      setContents(all.filter(c => c.is_published !== false).sort((a, b) => (a.order_num || 0) - (b.order_num || 0)));
    }).finally(() => setLoading(false));
  }, []);

  const required = contents.filter(c => c.is_required);
  const byCategory = contents.filter(c => !c.is_required).reduce((acc, c) => {
    const cat = c.category || "guide";
    acc[cat] = acc[cat] || [];
    acc[cat].push(c);
    return acc;
  }, {});

  const renderItem = (item) => {
    const cat = CAT_CONFIG[item.category] || CAT_CONFIG.guide;
    return (
      <SFCard key={item.id}>
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cat.color.replace("text-", "").replace("bg-", "bg-")}`}
            style={{}}>
            <span className="text-base">{cat.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white">{item.title}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${cat.color}`}>{cat.label}</span>
            </div>
            {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
            {item.content_url && (
              <a href={item.content_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                <ExternalLink className="h-3 w-3" /> 바로가기
              </a>
            )}
          </div>
        </div>
      </SFCard>
    );
  };

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <h1 className="text-base font-bold text-white">아카데미</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">등록된 콘텐츠가 없습니다</p>
          </div>
        ) : (
          <>
            {required.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-white">🔴 필수 항목</h2>
                {required.map(renderItem)}
              </div>
            )}
            {Object.entries(byCategory).map(([cat, items]) => {
              const cfg = CAT_CONFIG[cat] || CAT_CONFIG.guide;
              return (
                <div key={cat} className="space-y-3">
                  <h2 className="text-sm font-semibold text-white">{cfg.icon} {cfg.label}</h2>
                  {items.map(renderItem)}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}