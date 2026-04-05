import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import AdminHeader from "../components/AdminHeader";
import GradeBadge from "../components/GradeBadge";
import StatusBadge from "../components/StatusBadge";
import SFCard from "../components/SFCard";

const API = "https://solfort-js.onrender.com";
const TABS = ["딜러 현황", "매출 현황", "고객 데이터", "알림/전송"];
const GRADES = ["GREEN", "PURPLE", "GOLD", "PLATINUM"];
const today = new Date().toISOString().split("T")[0];

export default function AdminDealer() {
  const [tab, setTab] = useState(0);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title="딜러 관리자" accent="blue" />
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-white/[0.06]">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab === 0 && <DealerStatus />}
        {tab === 1 && <SalesStatus />}
        {tab === 2 && <CustomerData />}
        {tab === 3 && <NotifyPanel />}
      </div>
    </div>
  );
}

function DealerStatus() {
  const [dealers, setDealers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, s] = await Promise.all([
          base44.entities.DealerInfo.list("-created_date", 200),
          base44.entities.SalesRecord.list("-created_date", 1000),
        ]);
        setDealers(d);
        setSales(s);
      } catch { setError(true); }
      setLoading(false);
    })();
  }, []);

  const changeGrade = async (dealer, grade) => {
    setUpdating(dealer.id);
    await fetch(`${API}/dealers/${dealer.id}`, {
      method: "PATCH", headers: Auth.headers(),
      body: JSON.stringify({ grade }),
    });
    setDealers(prev => prev.map(d => d.id === dealer.id ? { ...d, grade } : d));
    setUpdating(null);
  };

  const todaySales = (name) => sales.filter(s => s.dealer_name === name && s.sale_date === today).reduce((a, s) => a + (s.sales_amount || 0), 0);
  const totalSales = (name) => sales.filter(s => s.dealer_name === name).reduce((a, s) => a + (s.sales_amount || 0), 0);

  if (loading) return <Loader />;
  if (error) return <ErrorMsg />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-white/[0.06]">
            {["대리점명","대리점주","등급","오늘매출","누적매출","등급변경"].map(h => (
              <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dealers.map(d => (
            <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
              <td className="py-3 px-2 text-gray-400">{d.owner_name}</td>
              <td className="py-3 px-2"><GradeBadge grade={d.grade} /></td>
              <td className="py-3 px-2 text-white">₩{todaySales(d.dealer_name).toLocaleString()}</td>
              <td className="py-3 px-2 text-white">₩{totalSales(d.dealer_name).toLocaleString()}</td>
              <td className="py-3 px-2">
                <div className="flex gap-1 flex-wrap">
                  {GRADES.map(g => (
                    <button key={g} onClick={() => changeGrade(d, g)} disabled={updating === d.id || d.grade === g}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${d.grade === g ? "bg-blue-500/30 text-blue-300" : "bg-white/5 text-gray-500 hover:bg-white/10"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SalesStatus() {
  const [date, setDate] = useState(today);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/sales/list?date=${date}`, { headers: Auth.headers() });
      const data = await res.json();
      setSales(Array.isArray(data) ? data : (data.sales || []));
    } catch { setError(true); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [date]);

  const total = sales.reduce((a, s) => a + (s.sales_amount || 0), 0);
  const byDealer = Object.values(sales.reduce((acc, s) => {
    acc[s.dealer_name] = acc[s.dealer_name] || { name: s.dealer_name, total: 0, count: 0 };
    acc[s.dealer_name].total += s.sales_amount || 0;
    acc[s.dealer_name].count += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
        <button onClick={load} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-xs">조회</button>
      </div>
      {loading ? <Loader /> : error ? <ErrorMsg /> : (
        <>
          <SFCard><p className="text-xs text-gray-500">총 매출</p><p className="text-2xl font-bold text-white mt-1">₩{total.toLocaleString()}</p><p className="text-xs text-gray-500 mt-0.5">{sales.length}건</p></SFCard>
          <div className="space-y-2">
            {byDealer.map((d, i) => (
              <SFCard key={d.name}>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-600 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.count}건</p>
                  </div>
                  <p className="text-sm font-bold text-white">₩{d.total.toLocaleString()}</p>
                </div>
              </SFCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CustomerData() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.SalesRecord.list("-created_date", 1000).then(setRecords).finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.customer_name?.toLowerCase().includes(q) || r.phone?.includes(q) || r.dealer_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.customer_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportCSV = () => {
    const header = "대리점명,고객명,전화,판매금액,USDT,SOF,상태,날짜";
    const rows = filtered.map(r => [r.dealer_name,r.customer_name,r.phone,r.sales_amount,r.usdt_amount,r.final_quantity,r.customer_status,r.sale_date].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "고객데이터.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객명 / 전화 / 대리점 검색"
          className="flex-1 min-w-48 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder-gray-600" />
        {["all","new","existing","duplicate"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs transition-all ${statusFilter === s ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400"}`}>
            {s === "all" ? "전체" : s === "new" ? "신규" : s === "existing" ? "기존" : "중복"}
          </button>
        ))}
        <button onClick={exportCSV} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs">CSV 내보내기</button>
      </div>
      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점","고객명","전화","금액","상태","날짜"].map(h => <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 text-gray-400">{r.dealer_name}</td>
                  <td className="py-2.5 px-2 text-white">{r.customer_name}</td>
                  <td className="py-2.5 px-2 text-gray-400">{r.phone}</td>
                  <td className="py-2.5 px-2 text-white">₩{(r.sales_amount||0).toLocaleString()}</td>
                  <td className="py-2.5 px-2"><StatusBadge status={r.customer_status} /></td>
                  <td className="py-2.5 px-2 text-gray-500">{r.sale_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-600 mt-2">{filtered.length}건</p>
        </div>
      )}
    </div>
  );
}

function NotifyPanel() {
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState("전체");
  const [date, setDate] = useState(today);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    base44.entities.DealerInfo.list("-created_date", 100).then(setDealers);
  }, []);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/telegram/send`, {
        method: "POST", headers: Auth.headers(),
        body: JSON.stringify({ dealer: selectedDealer, date }),
      });
      const data = await res.json();
      setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ✅ ${data.message || "전송 완료"}`, ...prev]);
    } catch (e) {
      setLogs(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ❌ 전송 실패: ${e.message}`, ...prev]);
    }
    setSending(false);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">텔레그램 전송</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400">대리점 선택</label>
            <select value={selectedDealer} onChange={e => setSelectedDealer(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
              <option value="전체">전체</option>
              {dealers.map(d => <option key={d.id} value={d.dealer_name}>{d.dealer_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">날짜</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
          </div>
          <button onClick={send} disabled={sending}
            className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50">
            {sending ? "전송 중..." : "📤 텔레그램 전송"}
          </button>
        </div>
      </SFCard>
      {logs.length > 0 && (
        <SFCard>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">전송 결과 로그</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((l, i) => <p key={i} className="text-xs text-gray-400 font-mono">{l}</p>)}
          </div>
        </SFCard>
      )}
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
}
function ErrorMsg() {
  return <p className="text-center text-gray-500 py-12 text-sm">데이터를 불러올 수 없습니다</p>;
}