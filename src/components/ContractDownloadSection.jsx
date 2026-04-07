import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
        actor: JSON.parse(localStorage.getItem('sf_user')||'{}').name,
        actor_role: JSON.parse(localStorage.getItem('sf_user')||'{}').role,
        target: "contract",
        action: `ê³ì½ì ë¤ì´ë¡ë: v${contract.version}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  if (loading) return null;

  return (
    <div className="mt-8 pt-6 border-t border-white/[0.06]">
      <h3 className="text-sm font-bold text-white mb-3">ð ê³ì½ì ë¤ì´ë¡ë</h3>
      {contract ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
          <div>
            <p className="text-xs text-gray-400">ë²ì </p>
            <p className="text-sm text-white font-semibold">{contract.version}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">ì ëª©</p>
            <p className="text-sm text-white">{contract.title}</p>
          </div>
          {contract.change_summary && (
            <div>
              <p className="text-xs text-gray-400">ë³ê²½ ë´ì©</p>
              <p className="text-xs text-gray-300">{contract.change_summary}</p>
            </div>
          )}
          <button
            onClick={download}
            disabled={!contract.file_url}
            className="w-full mt-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contract.file_url ? "ð¥ ë¤ì´ë¡ë" : "ê´ë¦¬ì ë±ë¡ ìì "}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-4">íì¬ ê³ì½ìê° ììµëë¤</p>
      )}
    </div>
  );
}