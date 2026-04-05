import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";

export default function ContractDownloadSection() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ContractVersion.filter({ is_current: true }, "-created_date", 1)
      .then(recs => setContract(recs[0] || null))
      .finally(() => setLoading(false));
  }, []);

  const download = () => {
    if (contract?.file_url) {
      window.open(contract.file_url, "_blank");
      base44.entities.SystemLog.create({
        log_type: "download",
        actor: Auth.getDealerName(),
        actor_role: Auth.getRole(),
        target: "contract",
        action: `계약서 다운로드: v${contract.version}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  if (loading) return null;

  return (
    <div className="mt-8 pt-6 border-t border-white/[0.06]">
      <h3 className="text-sm font-bold text-white mb-3">📄 계약서 다운로드</h3>
      {contract ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
          <div>
            <p className="text-xs text-gray-400">버전</p>
            <p className="text-sm text-white font-semibold">{contract.version}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">제목</p>
            <p className="text-sm text-white">{contract.title}</p>
          </div>
          {contract.change_summary && (
            <div>
              <p className="text-xs text-gray-400">변경 내용</p>
              <p className="text-xs text-gray-300">{contract.change_summary}</p>
            </div>
          )}
          <button
            onClick={download}
            disabled={!contract.file_url}
            className="w-full mt-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contract.file_url ? "📥 다운로드" : "관리자 등록 예정"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-4">현재 계약서가 없습니다</p>
      )}
    </div>
  );
}