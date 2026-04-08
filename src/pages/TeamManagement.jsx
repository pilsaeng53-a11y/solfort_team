import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import SFCard from "@/components/SFCard";
import { utils, writeFile } from "xlsx";

const today = new Date().toISOString().split("T")[0];
const thisMonth = today.slice(0, 7);

const POSITIONS = ["팀장", "부팀장", "팀원", "인턴"];

export default function TeamManagement() {
  const [members, setMembers] = useState([]);
  const [sales, setSales] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [editRate, setEditRate] = useState({});

  useEffect(() => {
    document.title = "SolFort - 팀 관리";
    const stored = JSON.parse(localStorage.getItem("sf_dealer") || "{}");
    setCurrentUser(stored);
    loadData(stored);
  }, []);

  const loadData = async (user) => {
    if (!user?.id) { setLoading(false); return; }
    const [allMembers, allSales, allIncentives] = await Promise.all([
      base44.entities.CallTeamMember.list("-created_date", 500),
      base44.entities.SalesRecord.list("-sale_date", 5000),
      base44.entities.IncentiveSetting.list("-set_at", 500),
    ]);
    const myMembers = allMembers.filter(
      m => m.parent_id === user.id || m.team_name === user.team_name
    );
    setMembers(myMembers);
    setSales(allSales);
    setIncentives(allIncentives);
    setLoading(false);
  };

  const memberSales = (name) =>
    sales.filter(s => s.dealer_name === name && (s.sale_date || "").startsWith(thisMonth))
      .reduce((a, s) => a + (s.sales_amount || 0), 0);

  const memberIncentiveRate = (id) => {
    const rec = incentives.filter(i => i.member_id === id && (i.month || "").startsWith(thisMonth))
      .sort((a, b) => new Date(b.set_at) - new Date(a.set_at))[0];
    return rec?.rate_percent ?? "";
  };

  const totalSales = members.reduce((a, m) => a + memberSales(m.name), 0);
  const avgSales = members.length > 0 ? totalSales / members.length : 0;
  const goalAchieved = members.filter(m => memberSales(m.name) > 0).length;
  const goalRate = members.length > 0 ? ((goalAchieved / members.length) * 100).toFixed(0) : 0;

  const updatePosition = async (id, position) => {
    setUpdating(id + "_pos");
    await base44.entities.CallTeamMember.update(id, { position });
    setMembers(prev => prev.map(m => m.id === id ? { ...m, position } : m));
    setUpdating(null);
  };

  const saveIncentiveRate = async (member) => {
    const rate = parseFloat(editRate[member.id]);
    if (isNaN(rate)) return;
    setUpdating(member.id + "_rate");
    const existing = incentives.find(i => i.member_id === member.id && (i.month || "").startsWith(thisMonth));
    if (existing) {
      await base44.entities.IncentiveSetting.update(existing.id, { rate_percent: rate });
      setIncentives(prev => prev.map(i => i.id === existing.id ? { ...i, rate_percent: rate } : i));
    } else {
      const created = await base44.entities.IncentiveSetting.create({
        member_id: member.id,
        member_name: member.name,
        member_username: member.username,
        rate_percent: rate,
        month: thisMonth,
        set_by: currentUser?.id,
        set_by_name: currentUser?.name || currentUser?.dealer_name,
        set_at: new Date().toISOString(),
      });
      setIncentives(prev => [...prev, created]);
    }
    setEditRate(prev => ({ ...prev, [member.id]: "" }));
    setUpdating(null);
  };

  const handleExport = () => {
    const rows = members.map(m => ({
      "이름": m.name,
      "아이디": m.username,
      "직책": m.position || "-",
      "팀명": m.team_name || "-",
      "이달매출": memberSales(m.name),
      "인센티브율(%)": memberIncentiveRate(m.id) || 0,
      "추천코드": m.referral_code || "-",
      "상태": m.status,
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "팀원현황");
    writeFile(wb, `팀원현황_${thisMonth}.xlsx`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: "팀원 수", value: `${members.length}명`, color: "text-emerald-400" },
    { label: "이달 총매출", value: `₩${(totalSales / 10000).toFixed(0)}만`, color: "text-yellow-400" },
    { label: "평균 매출", value: `₩${(avgSales / 10000).toFixed(0)}만`, color: "text-blue-400" },
    { label: "목표달성률", value: `${goalRate}%`, color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-[#080a12] px-4 py-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">👥 팀 관리</h1>
        <button onClick={handleExport}
          className="px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all">
          📥 팀원 내보내기
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <SFCard key={s.label}>
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </SFCard>
        ))}
      </div>

      {/* Member Table */}
      <SFCard>
        <h2 className="text-sm font-semibold text-white mb-4">팀원 현황</h2>
        {members.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">소속 팀원이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-white/[0.06]">
                  {["이름", "직책", "이달매출", "인센티브율", "추천코드", "상태"].map(h => (
                    <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const mSales = memberSales(m.name);
                  const mRate = memberIncentiveRate(m.id);
                  return (
                    <tr key={m.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                      <td className="py-3 px-2">
                        <select
                          value={m.position || "팀원"}
                          onChange={e => updatePosition(m.id, e.target.value)}
                          disabled={updating === m.id + "_pos"}
                          className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-[10px] disabled:opacity-50"
                        >
                          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-2 text-emerald-400 font-medium">₩{(mSales / 10000).toFixed(0)}만</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 min-w-[24px]">{mRate !== "" ? `${mRate}%` : "-"}</span>
                          <input
                            type="number"
                            value={editRate[m.id] ?? ""}
                            onChange={e => setEditRate(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="수정"
                            className="w-14 bg-white/5 border border-white/10 text-white rounded px-1.5 py-1 text-[10px] placeholder:text-gray-600"
                          />
                          <button
                            onClick={() => saveIncentiveRate(m)}
                            disabled={!editRate[m.id] || updating === m.id + "_rate"}
                            className="px-1.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-40"
                          >
                            저장
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-400 font-mono">{m.referral_code || "-"}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          m.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                          m.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {m.status === "active" ? "활성" : m.status === "pending" ? "대기" : "정지"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SFCard>
    </div>
  );
}