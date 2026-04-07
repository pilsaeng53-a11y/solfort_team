import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}

export default function BotManagementPanel() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [referralUsers, setReferralUsers] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [downline, setDownline] = useState([]);

  useEffect(() => {
    (async () => {
      const [dealers, callMembers, onlineMembers] = await Promise.all([
        base44.entities.DealerInfo.list("-created_date", 500),
        base44.entities.CallTeamMember.list("-created_date", 500),
        base44.entities.OnlineTeamMember.list("-created_date", 200),
      ]);
      const pendingAll = [
        ...dealers.filter(d => d.status === "pending").map(d => ({ ...d, _entity: "DealerInfo", _name: d.dealer_name || d.owner_name, _role: d.role || "dealer" })),
        ...callMembers.filter(m => m.status === "pending").map(m => ({ ...m, _entity: "CallTeamMember", _name: m.name, _role: m.role || "call_team" })),
        ...onlineMembers.filter(m => m.status === "pending").map(m => ({ ...m, _entity: "OnlineTeamMember", _name: m.name, _role: "online_team" })),
      ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setPending(pendingAll);

      const withCode = [
        ...dealers.filter(d => d.my_referral_code).map(d => ({ ...d, _name: d.dealer_name || d.owner_name, _entity: "DealerInfo" })),
        ...callMembers.filter(m => m.my_referral_code).map(m => ({ ...m, _name: m.name, _entity: "CallTeamMember" })),
        ...onlineMembers.filter(m => m.my_referral_code).map(m => ({ ...m, _name: m.name, _entity: "OnlineTeamMember" })),
      ];
      setReferralUsers(withCode);
      setLoading(false);
    })();
  }, []);

  const approve = async (user, status) => {
    setUpdating(user.id);
    const entity = base44.entities[user._entity];
    await entity.update(user.id, { status });
    setPending(prev => prev.filter(u => u.id !== user.id));
    setUpdating(null);
  };

  const showDownline = (code) => {
    setSelectedCode(code);
    const dl = referralUsers.filter(u => u.referral_code === code);
    setDownline(dl);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* Telegram Bot */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-3">🤖 텔레그램 봇</h3>
        <button onClick={() => window.open('/telegram-bot', '_blank')}
          className="px-4 py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-all">
          📊 봇 대시보드 열기
        </button>
      </SFCard>

      {/* Pending signups */}
      <SFCard>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-white">🔔 신규 가입자 알림</h3>
          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending.length}건</span>
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">대기 중인 가입자 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["이름","아이디","역할","직책","추천코드","가입일","처리"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pending.map(u => (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-white font-medium">{u._name}</td>
                    <td className="py-3 px-2 text-gray-500">{u.username}</td>
                    <td className="py-3 px-2 text-gray-400">{u._role}</td>
                    <td className="py-3 px-2 text-gray-400">{u.position || "-"}</td>
                    <td className="py-3 px-2 text-emerald-400">{u.referral_code || "-"}</td>
                    <td className="py-3 px-2 text-gray-500">{(u.created_date || "").split("T")[0]}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => approve(u, "active")} disabled={updating === u.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">✅ 승인</button>
                        <button onClick={() => approve(u, "rejected")} disabled={updating === u.id}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">❌ 거절</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SFCard>

      {/* Referral Code Management */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">🔗 추천코드 관리 ({referralUsers.length}명)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["이름","아이디","역할","추천코드","하위인원"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {referralUsers.map(u => {
                const cnt = referralUsers.filter(x => x.referral_code === u.my_referral_code).length;
                return (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-white font-medium">{u._name}</td>
                    <td className="py-3 px-2 text-gray-500">{u.username}</td>
                    <td className="py-3 px-2 text-gray-400">{u._entity === "CallTeamMember" ? "콜팀" : u._entity === "OnlineTeamMember" ? "온라인" : "대리점"}</td>
                    <td className="py-3 px-2">
                      <span className="text-emerald-400 font-mono font-bold">{u.my_referral_code}</span>
                    </td>
                    <td className="py-3 px-2">
                      <button onClick={() => showDownline(u.my_referral_code)}
                        className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[10px] hover:bg-purple-500/30">
                        {cnt}명 보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selectedCode && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-white">추천코드 <span className="text-emerald-400">{selectedCode}</span> 하위 ({downline.length}명)</p>
              <button onClick={() => setSelectedCode(null)} className="text-gray-500 text-xs hover:text-white">닫기</button>
            </div>
            {downline.length === 0 ? (
              <p className="text-xs text-gray-600">하위 인원 없음</p>
            ) : (
              <div className="space-y-1">
                {downline.map(u => (
                  <div key={u.id} className="flex items-center gap-3 text-xs py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-white font-medium">{u._name}</span>
                    <span className="text-gray-500">{u.username}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.status === "active" ? "bg-emerald-500/20 text-emerald-400" : u.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>{u.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SFCard>
    </div>
  );
}