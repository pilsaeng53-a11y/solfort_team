import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";

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
        action: `ÃªÂ³ÂÃ¬ÂÂ½Ã¬ÂÂ Ã«ÂÂ¤Ã¬ÂÂ´Ã«Â¡ÂÃ«ÂÂ: v${contract.version}`,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  if (loading) return null;

  return (
    <div className="mt-8 pt-6 border-t border-white/[0.06]">
      <h3 className="text-sm font-bold text-white mb-3">Ã°ÂÂÂ ÃªÂ³ÂÃ¬ÂÂ½Ã¬ÂÂ Ã«ÂÂ¤Ã¬ÂÂ´Ã«Â¡ÂÃ«ÂÂ</h3>
      {contract ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
          <div>
            <p className="text-xs text-gray-400">Ã«Â²ÂÃ¬Â Â</p>
            <p className="text-sm text-white font-semibold">{contract.version}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Ã¬Â ÂÃ«ÂªÂ©</p>
            <p className="text-sm text-white">{contract.title}</p>
          </div>
          {contract.change_summary && (
            <div>
              <p className="text-xs text-gray-400">Ã«Â³ÂÃªÂ²Â½ Ã«ÂÂ´Ã¬ÂÂ©</p>
              <p className="text-xs text-gray-300">{contract.change_summary}</p>
            </div>
          )}
          <button
            onClick={download}
            disabled={!contract.file_url}
            className="w-full mt-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contract.file_url ? "Ã°ÂÂÂ¥ Ã«ÂÂ¤Ã¬ÂÂ´Ã«Â¡ÂÃ«ÂÂ" : "ÃªÂ´ÂÃ«Â¦Â¬Ã¬ÂÂ Ã«ÂÂ±Ã«Â¡Â Ã¬ÂÂÃ¬Â Â"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-4">Ã­ÂÂÃ¬ÂÂ¬ ÃªÂ³ÂÃ¬ÂÂ½Ã¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤</p>
      )}
    </div>
  );
}