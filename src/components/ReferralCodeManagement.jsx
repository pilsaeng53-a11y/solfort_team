import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import SFCard from "@/components/SFCard";
import { toast } from "sonner";

export default function ReferralCodeManagement({ generateCode, sendTelegram }) {
  const [search, setSearch] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [teamFilter, setTeamFilter] = useState("all");
  const [sales, setSales] = useState([]);

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      const [d, c, o, s] = await Promise.all([
        base44.entities.DealerInfo.list("-created_date", 500),
        base44.entities.CallTeamMember.list("-created_date", 500),
        base44.entities.OnlineTeamMember.list("-created_date", 200),
        base44.entities.SalesRecord.list("-created_date", 5000),
      ]);
      setDealers(d);
      setCallMembers(c);
      setOnlineMembers(o);
      setSales(s);
    } catch (e) {}
  };

  const searchUsers = async () => {
    setLoading(true);
    setFoundUser(null);
    const q = search.toLowerCase();
    
    const dealer = dealers.find(d => d.dealer_name?.toLowerCase().includes(q) || d.username?.toLowerCase().includes(q));
    if (dealer) {
      setFoundUser({ ...dealer, _type: "dealer" });
      setLoading(false);
      return;
    }
    
    const callMember = callMembers.find(c => c.name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q));
    if (callMember) {
      setFoundUser({ ...callMember, _type: "call_team" });
      setLoading(false);
      return;
    }
    
    const onlineMember = onlineMembers.find(o => o.name?.toLowerCase().includes(q) || o.username?.toLowerCase().includes(q));
    if (onlineMember) {
      setFoundUser({ ...onlineMember, _type: "online_team" });
      setLoading(false);
      return;
    }
    
    setLoading(false);
  };

  const issueCode = async () => {
    if (!foundUser) return;
    if (!customCode.trim()) {
      toast.error("코드를 입력해주세요.");
      return;
    }
    setUpdating(true);
    try {
      const entity = foundUser._type === "dealer" ? base44.entities.DealerInfo : foundUser._type === "call_team" ? base44.entities.CallTeamMember : base44.entities.OnlineTeamMember;
      await entity.update(foundUser.id, { my_referral_code: customCode });
      const userName = foundUser._type === "dealer" ? foundUser.dealer_name : foundUser.name;
      await sendTelegram(`🔑 추천코드 발급\n사용자: ${userName}\n코드: ${customCode}`);
      toast.success("코드가 발급되었습니다.");
      setCustomCode("");
      setFoundUser(null);
      setSearch("");
      loadAllUsers();
    } catch (e) {
      toast.error("발급 실패: " + e.message);
    }
    setUpdating(false);
  };

  const reissueCode = async (userId, userType) => {
    setUpdating(userId);
    const newCode = generateCode();
    try {
      const entity = userType === "dealer" ? base44.entities.DealerInfo : userType === "call_team" ? base44.entities.CallTeamMember : base44.entities.OnlineTeamMember;
      await entity.update(userId, { my_referral_code: newCode });
      toast.success("코드가 재발급되었습니다.");
      loadAllUsers();
    } catch (e) {
      toast.error("재발급 실패");
    }
    setUpdating(null);
  };

  const getNetworkSales = (userId, userType) => {
    if (userType === "dealer") {
      const dealer = dealers.find(d => d.id === userId);
      if (!dealer) return 0;
      const networkNames = new Set([dealer.dealer_name]);
      return sales.filter(s => networkNames.has(s.dealer_name)).reduce((a, s) => a + (s.sales_amount || 0), 0);
    }
    return 0;
  };

  const getDownlineCount = (userId, userType) => {
    if (userType === "dealer") {
      return dealers.filter(d => d.parent_dealer_id === userId).length;
    }
    return 0;
  };

  const users = [
    ...dealers.map(d => ({ ...d, _type: "dealer", _typeLabel: "대리점", _icon: "🏪" })),
    ...callMembers.map(c => ({ ...c, _type: "call_team", _typeLabel: "콜팀", _icon: "📞" })),
    ...onlineMembers.map(o => ({ ...o, _type: "online_team", _typeLabel: "온라인팀", _icon: "💻" })),
  ];

  const filteredUsers = teamFilter === "all" ? users : users.filter(u => u._type === (teamFilter === "dealer" ? "dealer" : teamFilter === "call" ? "call_team" : "online_team"));

  return (
    <div className="space-y-6">
      {/* 수동 코드 발급 */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">🔑 수동 코드 발급</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름/아이디로 검색..."
              className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600"
            />
            <button
              onClick={searchUsers}
              disabled={loading || !search.trim()}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-medium hover:bg-purple-500/30 disabled:opacity-50"
            >
              {loading ? "검색 중..." : "검색"}
            </button>
          </div>

          {foundUser && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-sm mb-3">
                <p className="text-white font-medium">{foundUser._type === "dealer" ? foundUser.dealer_name : foundUser.name}</p>
                <p className="text-xs text-gray-500 mt-1">{foundUser._typeLabel} • {foundUser._type === "dealer" ? foundUser.owner_name : foundUser.username}</p>
                {foundUser.my_referral_code && <p className="text-xs text-emerald-400 mt-1">현재코드: {foundUser.my_referral_code}</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={customCode}
                  onChange={e => setCustomCode(e.target.value)}
                  placeholder="코드 직접입력"
                  className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600"
                />
                <button
                  onClick={() => setCustomCode(generateCode())}
                  className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500/30"
                >
                  랜덤생성
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={issueCode}
                  disabled={updating || !customCode.trim()}
                  className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  {updating ? "발급 중..." : "발급"}
                </button>
                <button
                  onClick={() => { setFoundUser(null); setCustomCode(""); setSearch(""); }}
                  className="flex-1 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </SFCard>

      {/* 전체 코드 현황 */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">📊 전체 코드 현황</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {[["all", "전체"], ["dealer", "대리점"], ["call", "콜팀"], ["online", "온라인팀"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTeamFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${teamFilter === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/[0.06]">
                {["이름", "역할", "직책", "추천코드", "하부인원수", "네트워크매출", "액션"].map(h => (
                  <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.filter(u => u.my_referral_code || u.referral_code).map(u => (
                <tr key={u.id} className="border-b border-white/[0.04]">
                  <td className="py-2 px-2 text-white font-medium">{u._type === "dealer" ? u.dealer_name : u.name}</td>
                  <td className="py-2 px-2 text-gray-400">{u._typeLabel}</td>
                  <td className="py-2 px-2 text-gray-500 text-[10px]">{u._type === "dealer" ? u.grade : u.team || "-"}</td>
                  <td className="py-2 px-2 text-emerald-400 font-mono">{u.my_referral_code || u.referral_code || "-"}</td>
                  <td className="py-2 px-2 text-blue-400">{getDownlineCount(u.id, u._type)}</td>
                  <td className="py-2 px-2 text-yellow-400">₩{(getNetworkSales(u.id, u._type) / 10000).toFixed(0)}만</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => reissueCode(u.id, u._type)}
                      disabled={updating === u.id}
                      className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded hover:bg-orange-500/30 disabled:opacity-50"
                    >
                      {updating === u.id ? "발급 중..." : "코드재발급"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SFCard>
    </div>
  );
}