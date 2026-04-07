import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, X } from "lucide-react";

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ sales: [], dealers: [], calls: [], leads: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!expanded && inputRef.current) {
      inputRef.current.blur();
    }
  }, [expanded]);

  const performSearch = async (q) => {
    if (!q.trim()) {
      setResults({ sales: [], dealers: [], calls: [], leads: [] });
      return;
    }
    setLoading(true);
    try {
      const [sales, dealers, calls, leads] = await Promise.all([
        base44.entities.SalesRecord.list("-created_date", 100),
        base44.entities.DealerInfo.list("-created_date", 100),
        base44.entities.CallTeamMember.list("-created_date", 100),
        base44.entities.CallLead.list("-created_date", 100),
      ]);

      const lq = q.toLowerCase();
      setResults({
        sales: sales.filter(s => 
          (s.customer_name?.toLowerCase().includes(lq) || s.phone?.includes(q)) && s.customer_name
        ).slice(0, 5),
        dealers: dealers.filter(d => 
          (d.dealer_name?.toLowerCase().includes(lq) || d.username?.toLowerCase().includes(lq)) && d.role !== 'manager'
        ).slice(0, 5),
        calls: calls.filter(c => 
          (c.name?.toLowerCase().includes(lq) || c.username?.toLowerCase().includes(lq)) && c.status === 'active'
        ).slice(0, 5),
        leads: leads.filter(l => 
          (l.name?.toLowerCase().includes(lq) || l.phone?.includes(q)) && l.name
        ).slice(0, 5),
      });
    } catch (e) {
      setResults({ sales: [], dealers: [], calls: [], leads: [] });
    }
    setLoading(false);
  };

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(val), 300);
  };

  const handleResultClick = (type, item) => {
    if (type === 'sales') {
      navigate(`/records?id=${item.id}`);
    } else if (type === 'dealers') {
      navigate(`/admin/dealer?id=${item.id}`);
    } else if (type === 'calls') {
      navigate(`/call/dashboard`);
    } else if (type === 'leads') {
      navigate(`/call/leads?id=${item.id}`);
    }
    setExpanded(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setExpanded(false);
      setQuery("");
    }
  };

  const hasResults = results.sales.length > 0 || results.dealers.length > 0 || results.calls.length > 0 || results.leads.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
      >
        <Search className="h-4 w-4" />
      </button>

      {expanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div className="absolute top-full right-0 mt-2 w-80 bg-[#0a0c15] border border-white/10 rounded-xl shadow-2xl z-50">
            <div className="p-3 border-b border-white/10">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="검색..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-xs text-gray-500">검색 중...</div>
              ) : query.trim() === "" ? (
                <div className="p-4 text-center text-xs text-gray-600">검색어를 입력하세요</div>
              ) : !hasResults ? (
                <div className="p-4 text-center text-xs text-gray-600">검색 결과 없음</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {results.sales.length > 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">고객기록</p>
                      {results.sales.map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleResultClick('sales', r)}
                          className="w-full text-left px-2 py-2 rounded hover:bg-white/5 transition-all text-xs"
                        >
                          <p className="text-white font-medium">👤 {r.customer_name}</p>
                          <p className="text-[10px] text-gray-500">{r.phone} · ₩{(r.sales_amount || 0).toLocaleString()}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.dealers.length > 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">대리점</p>
                      {results.dealers.map(d => (
                        <button
                          key={d.id}
                          onClick={() => handleResultClick('dealers', d)}
                          className="w-full text-left px-2 py-2 rounded hover:bg-white/5 transition-all text-xs"
                        >
                          <p className="text-white font-medium">🏪 {d.dealer_name}</p>
                          <p className="text-[10px] text-gray-500">{d.owner_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.calls.length > 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">콜팀</p>
                      {results.calls.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleResultClick('calls', c)}
                          className="w-full text-left px-2 py-2 rounded hover:bg-white/5 transition-all text-xs"
                        >
                          <p className="text-white font-medium">📞 {c.name}</p>
                          <p className="text-[10px] text-gray-500">{c.team || '미배정'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.leads.length > 0 && (
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">리드</p>
                      {results.leads.map(l => (
                        <button
                          key={l.id}
                          onClick={() => handleResultClick('leads', l)}
                          className="w-full text-left px-2 py-2 rounded hover:bg-white/5 transition-all text-xs"
                        >
                          <p className="text-white font-medium">🎯 {l.name}</p>
                          <p className="text-[10px] text-gray-500">{l.phone} · {l.status}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}