import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "@/components/SFCard";
import { Users, Play, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";

const BOT_TOKEN = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
const CHAT_ID = "5757341051";

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
  } catch {}
}

export default function LeadDistribution() {
  const [autoOn, setAutoOn] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [method, setMethod] = useState("round-robin");
  const [pendingLeads, setPendingLeads] = useState([]);
  const [history, setHistory] = useState([]);
  const [distributing, setDistributing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rrIndex, setRrIndex] = useState(0);

  useEffect(() => {
    document.title = "SolFort - 리드 자동 배분";
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [members, leads] = await Promise.all([
      base44.entities.CallTeamMember.filter({ status: "active" }, "-created_date", 500),
      base44.entities.CallLead.list("-created_date", 1000),
    ]);
    const teamSet = [...new Set(members.map(m => m.team).filter(Boolean))];
    setTeams(teamSet);
    if (!selectedTeam && teamSet.length > 0) setSelectedTeam(teamSet[0]);
    const pending = leads.filter(l => l.status === "신규" && !l.assigned_to);
    setPendingLeads(pending);
    const assigned = leads.filter(l => l.assigned_to && l.assigned_at).sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at)).slice(0, 50);
    setHistory(assigned);
    setLoading(false);
  };

  const handleDistribute = async () => {
    if (!selectedTeam || pendingLeads.length === 0) return;
    setDistributing(true);
    try {
      const [members, allLeads] = await Promise.all([
        base44.entities.CallTeamMember.filter({ team: selectedTeam, status: "active" }, "-created_date", 200),
        base44.entities.CallLead.list("-created_date", 2000),
      ]);
      if (members.length === 0) { alert("배분할 팀원이 없습니다."); setDistributing(false); return; }

      // Count current assignments per member
      const countMap = {};
      members.forEach(m => { countMap[m.username] = 0; });
      allLeads.forEach(l => {
        if (l.assigned_to && l.status !== "거절" && countMap.hasOwnProperty(l.assigned_to)) {
          countMap[l.assigned_to]++;
        }
      });

      let sortedMembers = [...members];
      let idx = rrIndex;

      const now = new Date().toISOString();
      const newHistory = [];

      for (const lead of pendingLeads) {
        let target;
        if (method === "round-robin") {
          target = sortedMembers[idx % sortedMembers.length];
          idx++;
        } else {
          // least-assigned first
          sortedMembers.sort((a, b) => (countMap[a.username] || 0) - (countMap[b.username] || 0));
          target = sortedMembers[0];
          countMap[target.username] = (countMap[target.username] || 0) + 1;
        }
        await base44.entities.CallLead.update(lead.id, {
          assigned_to: target.username,
          assigned_at: now,
        });
        await sendTelegram(`[배분] ${target.name}에게 ${lead.name} 배분됨`);
        newHistory.push({ ...lead, assigned_to: target.username, assigned_at: now, _member_name: target.name });
      }

      if (method === "round-robin") setRrIndex(idx);
      setPendingLeads([]);
      setHistory(prev => [...newHistory, ...prev].slice(0, 50));
      alert(`${newHistory.length}건 배분 완료`);
    } catch (e) {
      alert("배분 중 오류: " + e.message);
    }
    setDistributing(false);
  };

  return (
    <div className="min-h-screen bg-[#080a12] p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-purple-400" />
        <h1 className="text-lg font-bold text-white">리드 자동 배분</h1>
      </div>

      {/* 자동 배분 설정 */}
      <SFCard>
        <h2 className="text-sm font-bold text-white mb-4">⚙️ 자동 배분 설정</h2>
        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">자동 배분</span>
            <button onClick={() => setAutoOn(p => !p)} className="flex items-center gap-2 transition-all">
              {autoOn
                ? <><ToggleRight className="h-8 w-8 text-emerald-400" /><span className="text-xs text-emerald-400 font-bold">ON</span></>
                : <><ToggleLeft className="h-8 w-8 text-gray-500" /><span className="text-xs text-gray-500">OFF</span></>
              }
            </button>
          </div>

          {/* Team */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">배분 대상 팀</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
              {teams.length === 0 && <option value="">팀 없음</option>}
            </select>
          </div>

          {/* Method */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">배분 방식</label>
            <div className="flex gap-2">
              {[["round-robin", "🔄 순번 배분"], ["least", "📊 적은건수 우선"]].map(([v, l]) => (
                <button key={v} onClick={() => setMethod(v)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${method === v ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-white/5 text-gray-500 border-white/10"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SFCard>

      {/* 대기 리드 */}
      <SFCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">📋 대기 리드 <span className="text-purple-400">({pendingLeads.length}건)</span></h2>
          <button onClick={loadData} disabled={loading} className="p-1.5 text-gray-500 hover:text-gray-300 transition-all">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {pendingLeads.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">배분 대기 중인 리드가 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["고객명", "연락처", "유입경로", "등록일"].map(h => (
                  <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pendingLeads.slice(0, 20).map(l => (
                  <tr key={l.id} className="border-b border-white/[0.04]">
                    <td className="py-2 px-2 text-white font-medium">{l.name}</td>
                    <td className="py-2 px-2 text-gray-400">{l.phone}</td>
                    <td className="py-2 px-2 text-gray-500">{l.source || "-"}</td>
                    <td className="py-2 px-2 text-gray-600">{(l.created_date || "").split("T")[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pendingLeads.length > 20 && <p className="text-xs text-gray-600 mt-2 text-center">외 {pendingLeads.length - 20}건 더...</p>}
          </div>
        )}

        <button
          onClick={handleDistribute}
          disabled={distributing || pendingLeads.length === 0 || !selectedTeam}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-bold hover:bg-purple-500/30 disabled:opacity-40 transition-all"
        >
          <Play className="h-4 w-4" />
          {distributing ? "배분 중..." : `배분 실행 (${pendingLeads.length}건)`}
        </button>
      </SFCard>

      {/* 배분 이력 */}
      <SFCard>
        <h2 className="text-sm font-bold text-white mb-3">📊 배분 이력 (최근 50건)</h2>
        {history.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">배분 이력이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["고객명", "연락처", "배분 담당자", "배분 일시"].map(h => (
                  <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {history.map(l => (
                  <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-white font-medium">{l.name}</td>
                    <td className="py-2 px-2 text-gray-400">{l.phone}</td>
                    <td className="py-2 px-2 text-purple-400">{l._member_name || l.assigned_to}</td>
                    <td className="py-2 px-2 text-gray-600">{(l.assigned_at || "").replace("T", " ").substring(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SFCard>
    </div>
  );
}