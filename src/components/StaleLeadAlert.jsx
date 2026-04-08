import { useState, useEffect } from "react";
const API = 'https://solfort-api-9red.onrender.com';
const h = () => ({'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('sf_token')});

export default function StaleLeadAlert() {
  const [stale, setStale] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API+'/api/leads', {headers:h()});
        const leads = await res.json();
        const threeDaysAgo = Date.now() - 3*24*60*60*1000;
        const staleLeads = Array.isArray(leads) ? leads.filter(l => 
          l.status === '가망' && new Date(l.created_at||l.updated_at) < threeDaysAgo
        ) : [];
        setStale(staleLeads);
      } catch {}
    })();
  }, []);
  
  if (stale.length === 0) return null;
  return (
    <div className="mx-4 mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
      <p className="text-xs font-bold text-amber-400">⚠️ 3일 이상 미처리 리드 {stale.length}건</p>
      <p className="text-xs text-gray-500 mt-0.5">빠른 후속 조치가 필요합니다</p>
    </div>
  );
}