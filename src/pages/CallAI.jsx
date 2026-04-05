import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "../components/SFCard";
import { Bot, Send, Sparkles } from "lucide-react";

const QUICK_PROMPTS = [
  "관심은 있지만 망설이는 고객을 설득하는 방법",
  "처음 전화하는 신규 고객에게 어떻게 소개해야 하나요?",
  "고객이 '나중에 연락하겠다'고 할 때 대응 방법",
  "투자 금액에 대한 불안감을 해소하는 멘트",
  "SOL Fort 상품의 핵심 장점 3가지 요약",
  "거절 당한 고객에게 재콜할 때 오프닝 멘트",
];

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
}

export default function CallAI() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => { document.title = "SolFort - AI 도우미"; }, []);

  const ask = async (q) => {
    const question = q || prompt;
    if (!question.trim()) return;
    setLoading(true); setPrompt(""); setAnswer("");
    const fullPrompt = `당신은 SolFort 콜영업팀을 위한 AI 영업 코치입니다. 
콜영업팀은 대리점들과 고객을 연결해 SOF 토큰을 판매하는 일을 합니다.
실용적이고 구체적인 영업 조언, 스크립트, 대화 예시를 한국어로 제공해주세요.

질문: ${question}`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
    setAnswer(res);
    setHistory(prev => [{ q: question, a: res, id: Date.now() }, ...prev.slice(0, 9)]);
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-emerald-400" />
        <h1 className="text-lg font-bold text-white">AI 영업 도우미</h1>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">GPT 기반</span>
      </div>

      <SFCard>
        <div className="flex gap-2">
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder="영업 관련 질문을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
            rows={3} className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm resize-none placeholder:text-gray-600" />
          <button onClick={() => ask()} disabled={loading || !prompt.trim()}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 transition-all disabled:opacity-40 self-end">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </SFCard>

      <div>
        <p className="text-[10px] text-gray-600 mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> 빠른 질문</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => ask(p)} disabled={loading}
              className="text-[10px] bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 text-left">
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <SFCard>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400">AI가 답변을 생성하고 있습니다...</p>
          </div>
        </SFCard>
      )}

      {answer && (
        <SFCard className="border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-400">AI 답변</p>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{answer}</p>
        </SFCard>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">이전 질문</p>
          {history.slice(answer ? 1 : 0).map(h => (
            <SFCard key={h.id} className="opacity-60 hover:opacity-100 transition-all">
              <p className="text-xs text-gray-400 font-medium mb-2">Q: {h.q}</p>
              <p className="text-xs text-gray-500 line-clamp-3">{h.a}</p>
              <button onClick={() => setAnswer(h.a)} className="text-[10px] text-emerald-400 mt-2 hover:underline">자세히 보기</button>
            </SFCard>
          ))}
        </div>
      )}
    </div>
  );
}