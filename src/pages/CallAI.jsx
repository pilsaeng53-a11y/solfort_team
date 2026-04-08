import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Bot, Copy, Check, Sparkles } from "lucide-react";

const TABS = ["고객 분석", "스크립트 생성", "대응 멘트 추천"];
const GOALS = ["첫 통화", "재콜", "매출 전환", "리크루팅"];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={doCopy} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] transition-all ${copied ? "bg-emerald-500/30 text-emerald-300" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
      {copied ? <><Check className="h-3 w-3" /> 복사됨</> : <><Copy className="h-3 w-3" /> 복사</>}
    </button>
  );
}

async function callAI(prompt) {
  const res = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6" });
  return res;
}

export default function CallAI() {
  const [tab, setTab] = useState(0);
  const [leads, setLeads] = useState([]);

  // Tab 1
  const [analysisLead, setAnalysisLead] = useState("");
  const [analysisSituation, setAnalysisSituation] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  // Tab 2
  const [scriptSituation, setScriptSituation] = useState("");
  const [scriptGoal, setScriptGoal] = useState("첫 통화");
  const [scriptResult, setScriptResult] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState("");

  // Tab 3
  const [response, setResponse] = useState("");
  const [responseMents, setResponseMents] = useState([]);
  const [responseLoading, setResponseLoading] = useState(false);
  const [responseError, setResponseError] = useState("");

  useEffect(() => {
    document.title = "SolFort - AI 도우미";
    base44.entities.CallLead.list("-created_date", 200).then(setLeads);
  }, []);

  const pickLeadForAnalysis = id => {
    const found = leads.find(l => l.id === id);
    if (found) setAnalysisSituation(`고객명: ${found.name}\n연락처: ${found.phone}\n관심금액: ${found.interest_amount ? "₩" + Number(found.interest_amount).toLocaleString() : "미정"}\n관심도: ${found.interest_level || "미지정"}\n상태: ${found.status}\n메모: ${found.memo || "없음"}`);
    setAnalysisLead(id);
  };

  const doAnalysis = async () => {
    if (!analysisSituation.trim()) return;
    setAnalysisLoading(true); setAnalysisError(""); setAnalysisResult("");
    try {
      const prompt = `다음 고객 정보를 분석하고 영업 전략을 추천해주세요:\n\n${analysisSituation}\n\n응답은 한국어로, 아래 3가지로 구분해서 답해주세요:\n1. 고객 성향 분석\n2. 추천 접근법\n3. 주의사항`;
      const r = await callAI(prompt);
      setAnalysisResult(r);
    } catch { setAnalysisError("AI 응답을 받을 수 없습니다. 잠시 후 다시 시도해주세요."); }
    setAnalysisLoading(false);
  };

  const doScript = async () => {
    if (!scriptSituation.trim()) return;
    setScriptLoading(true); setScriptError(""); setScriptResult("");
    try {
      const prompt = `다음 상황에 맞는 콜 영업 스크립트를 작성해주세요.\n상황: ${scriptSituation}\n목표: ${scriptGoal}\n\n한국어로, 자연스럽고 설득력 있게, 30초~1분 분량으로 작성해주세요.`;
      const r = await callAI(prompt);
      setScriptResult(r);
    } catch { setScriptError("AI 응답을 받을 수 없습니다. 잠시 후 다시 시도해주세요."); }
    setScriptLoading(false);
  };

  const doResponse = async () => {
    if (!response.trim()) return;
    setResponseLoading(true); setResponseError(""); setResponseMents([]);
    try {
      const prompt = `콜 영업 중 고객이 다음과 같이 말했습니다: "${response}"\n\n이에 대한 자연스럽고 설득력 있는 대응 멘트 3가지를 한국어로 추천해주세요.\n\n반드시 다음 형식으로 답해주세요:\n[1] 첫 번째 대응 멘트\n[2] 두 번째 대응 멘트\n[3] 세 번째 대응 멘트`;
      const r = await callAI(prompt);
      const parts = r.split(/\[\d\]/).filter(s => s.trim());
      setResponseMents(parts.length >= 2 ? parts : [r]);
    } catch { setResponseError("AI 응답을 받을 수 없습니다. 잠시 후 다시 시도해주세요."); }
    setResponseLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">AI 영업 도우미</h1>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> Claude AI</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/[0.06]">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${tab === i ? "border-emerald-400 text-emerald-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab 1: 고객 분석 */}
        {tab === 0 && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400">리드에서 선택 (선택사항)</label>
              <select value={analysisLead} onChange={e => pickLeadForAnalysis(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                <option value="">-- 직접 입력 --</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400">고객 상황 입력</label>
              <textarea value={analysisSituation} onChange={e => setAnalysisSituation(e.target.value)} rows={5}
                placeholder="예: 50대 남성, 투자 경험 없음, 관심은 있지만 망설이는 중..."
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none placeholder:text-gray-600" />
            </div>
            <button onClick={doAnalysis} disabled={analysisLoading || !analysisSituation.trim()}
              className="w-full py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
              {analysisLoading ? "AI가 분석 중입니다..." : "분석 요청"}
            </button>
            {analysisLoading && <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>}
            {analysisError && <p className="text-xs text-red-400 text-center">{analysisError}</p>}
            {analysisResult && (
              <SFCard className="border border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-emerald-400" /><p className="text-xs font-semibold text-emerald-400">AI 분석 결과</p></div>
                  <CopyBtn text={analysisResult} />
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{analysisResult}</p>
              </SFCard>
            )}
          </div>
        )}

        {/* Tab 2: 스크립트 생성 */}
        {tab === 1 && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400">상황 설명</label>
              <textarea value={scriptSituation} onChange={e => setScriptSituation(e.target.value)} rows={4}
                placeholder="예: 50대 남성, 투자 경험 없음, 망설이는 중..."
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none placeholder:text-gray-600" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">목표</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {GOALS.map(g => (
                  <button key={g} onClick={() => setScriptGoal(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${scriptGoal === g ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-500"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={doScript} disabled={scriptLoading || !scriptSituation.trim()}
              className="w-full py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
              {scriptLoading ? "AI가 분석 중입니다..." : "스크립트 생성"}
            </button>
            {scriptLoading && <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>}
            {scriptError && <p className="text-xs text-red-400 text-center">{scriptError}</p>}
            {scriptResult && (
              <SFCard className="border border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-emerald-400" /><p className="text-xs font-semibold text-emerald-400">생성된 스크립트</p></div>
                  <CopyBtn text={scriptResult} />
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">{scriptResult}</p>
                </div>
              </SFCard>
            )}
          </div>
        )}

        {/* Tab 3: 대응 멘트 추천 */}
        {tab === 2 && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400">고객 반응 입력</label>
              <textarea value={response} onChange={e => setResponse(e.target.value)} rows={3}
                placeholder="예: 너무 비싸요 / 나중에요 / 사기 아닌가요?"
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none placeholder:text-gray-600" />
            </div>
            <button onClick={doResponse} disabled={responseLoading || !response.trim()}
              className="w-full py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
              {responseLoading ? "AI가 분석 중입니다..." : "추천 받기"}
            </button>
            {responseLoading && <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>}
            {responseError && <p className="text-xs text-red-400 text-center">{responseError}</p>}
            {responseMents.length > 0 && (
              <div className="space-y-3">
                {responseMents.map((m, i) => (
                  <SFCard key={i} className="border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-emerald-400 font-semibold">💬 대응 멘트 {i + 1}</span>
                      <CopyBtn text={m.trim()} />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{m.trim()}</p>
                  </SFCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}