import { useNavigate } from "react-router-dom";
import SFCard from "../components/SFCard";
import { ArrowLeft, BookOpen, CheckCircle, FileText, AlertTriangle } from "lucide-react";

const SECTIONS = [
  {
    title: "📋 필수 진행 항목",
    items: [
      { icon: CheckCircle, label: "대리점 계약 등록", desc: "본사와의 계약 서류 업로드 필수", done: true },
      { icon: CheckCircle, label: "KYC 인증 완료", desc: "신분증 및 사업자등록증 제출", done: true },
      { icon: FileText, label: "SOF 지갑 연동", desc: "리베이트 수령용 지갑 등록", done: false },
      { icon: FileText, label: "영업 가이드 학습", desc: "신규 대리점 필수 학습 과정", done: false },
    ],
  },
  {
    title: "📚 학습 진행 현황",
    items: [
      { icon: BookOpen, label: "SOF 토큰 이해하기", desc: "토큰 경제 구조 및 활용 방법", progress: 100 },
      { icon: BookOpen, label: "고객 응대 매뉴얼", desc: "고객 질문 대응 가이드라인", progress: 60 },
      { icon: BookOpen, label: "프로모션 운영 가이드", desc: "300%/400% 프로모션 운영 방법", progress: 30 },
      { icon: BookOpen, label: "USDT 거래 안내", desc: "USDT 환전 및 송금 절차", progress: 0 },
    ],
  },
  {
    title: "⚠️ 중요 가이드",
    items: [
      { icon: AlertTriangle, label: "중복 등록 주의사항", desc: "동일 고객 중복 등록 시 패널티 안내", important: true },
      { icon: AlertTriangle, label: "지갑 보안 관리", desc: "시드 구문 및 개인키 보안 가이드", important: true },
      { icon: FileText, label: "세무 처리 안내", desc: "매출 관련 세무 처리 방법", important: false },
    ],
  },
];

export default function Academy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <h1 className="text-base font-bold text-white">아카데미</h1>
          </div>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-sm font-semibold text-white">{section.title}</h2>
            {section.items.map((item, i) => (
              <SFCard key={i}>
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.done ? "bg-emerald-500/20" : item.important ? "bg-red-500/20" : "bg-blue-500/10"
                  }`}>
                    <item.icon className={`h-4 w-4 ${
                      item.done ? "text-emerald-400" : item.important ? "text-red-400" : "text-blue-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    {item.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-gray-500">진행률</span>
                          <span className="text-gray-400">{item.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {item.done !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      item.done ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-500"
                    }`}>
                      {item.done ? "완료" : "미완료"}
                    </span>
                  )}
                </div>
              </SFCard>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}