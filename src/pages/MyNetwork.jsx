import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { Auth } from "@/api/neonClient";

const thisMonth = (() => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
})();

function MemberCard({ member, monthlySales }) {
  const name = member.dealer_name || member.owner_name || member.name || "-";
  const position = member.position || member.role || "-";
  const phone = member.phone || "-";
  const joinDate = (member.created_date || "").split("T")[0] || "-";
  const sales = monthlySales[member.dealer_name] || monthlySales[member.name] || 0;

  return (
    <div className="bg-[#0a1a12] border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{name}</span>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{position}</span>
      </div>
      <div className="text-[11px] text-gray-400">{phone}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-gray-600">가입: {joinDate}</span>
        {sales > 0 && (
          <span className="text-[11px] font-bold text-emerald-400">₩{sales.toLocaleString()}</span>
        )}
        {sales === 0 && <span className="text-[10px] text-gray-700">이달 매출 없음</span>}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-emerald-400" }) {
  return (
    <div className="bg-[#0a1a12] border border-emerald-500/20 rounded-xl p-3 text-center">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function MyNetwork() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [direct, setDirect] = useState([]);
  const [indirect, setIndirect] = useState([]);
  const [monthlySales, setMonthlySales] = useState({});

  useEffect(() => {
    (async () => {
      const userId = localStorage.getItem("sf_session_id");
      const role = Auth.getRole();

      // Load current user entity
      let me = null;
      try {
        if (role === "dealer" || role === "manager" || role === "dealer_admin") {
          const dealers = await base44.entities.DealerInfo.list("-created_date", 500);
          me = dealers.find(d => d.id === userId);
        } else if (role === "call_team" || role === "call_admin") {
          const callMembers = await base44.entities.CallTeamMember.list("-created_date", 500);
          me = callMembers.find(m => m.id === userId);
        } else if (role === "super_admin") {
          const admins = await base44.entities.SuperAdmin ? base44.entities.SuperAdmin.list() : Promise.resolve([]);
          // fallback: try DealerInfo
          const dealers = await base44.entities.DealerInfo.list("-created_date", 500);
          me = dealers.find(d => d.id === userId) || null;
        }
      } catch (e) {}

      setCurrentUser(me);

      if (!me) { setLoading(false); return; }

      // Load all potential members
      const [allDealers, allCallMembers, allSales] = await Promise.all([
        base44.entities.DealerInfo.list("-created_date", 1000),
        base44.entities.CallTeamMember.list("-created_date", 1000),
        base44.entities.SalesRecord.list("-sale_date", 5000),
      ]);

      const myReferralCode = me.my_referral_code || "";
      const myId = me.id;

      // Direct downline: parent_dealer_id === myId OR referral_code === myReferralCode
      const isDirectDealer = d =>
        (d.id !== myId) &&
        (d.parent_dealer_id === myId ||
         (myReferralCode && d.referral_code === myReferralCode));
      const isDirectCall = m =>
        (m.id !== myId) &&
        (m.parent_dealer_id === myId ||
         (myReferralCode && m.referral_code === myReferralCode));

      const directDealers = allDealers.filter(isDirectDealer);
      const directCall = allCallMembers.filter(isDirectCall);
      const directAll = [...directDealers, ...directCall];

      // Indirect: parent in directAll ids or referral_code in directAll my_referral_codes
      const directIds = new Set(directAll.map(m => m.id));
      const directRefCodes = new Set(directAll.map(m => m.my_referral_code).filter(Boolean));

      const isIndirect = m =>
        !directIds.has(m.id) && m.id !== myId &&
        (directIds.has(m.parent_dealer_id) ||
         (m.referral_code && directRefCodes.has(m.referral_code)));

      const indirectDealers = allDealers.filter(isIndirect);
      const indirectCall = allCallMembers.filter(isIndirect);
      const indirectAll = [...indirectDealers, ...indirectCall];

      // Monthly sales map: dealer_name → amount
      const salesMap = {};
      allSales
        .filter(s => (s.sale_date || "").startsWith(thisMonth))
        .forEach(s => {
          salesMap[s.dealer_name] = (salesMap[s.dealer_name] || 0) + (s.sales_amount || 0);
        });

      setDirect(directAll);
      setIndirect(indirectAll);
      setMonthlySales(salesMap);
      setLoading(false);
    })();
  }, []);

  const totalNetworkSales = [...direct, ...indirect].reduce((acc, m) => {
    const name = m.dealer_name || m.name || "";
    return acc + (monthlySales[name] || 0);
  }, 0);

  const myName = currentUser
    ? currentUser.dealer_name || currentUser.owner_name || currentUser.name || "-"
    : "-";
  const myPosition = currentUser?.position || currentUser?.role || "-";
  const myTeam = currentUser?.team || currentUser?.region || currentUser?.assigned_dealer || "-";
  const myCode = currentUser?.my_referral_code || "-";

  return (
    <div className="min-h-screen bg-[#080a12] p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-white mb-5">🌿 내 네트워크</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* My Info Card */}
          {currentUser && (
            <div className="bg-[#0a1a12] border border-emerald-500/30 rounded-2xl p-5 mb-5">
              <p className="text-xs text-gray-500 mb-3 font-semibold">내 정보</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
                  🌿
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white">{myName}</p>
                  <p className="text-xs text-gray-400">{myPosition} · {myTeam}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] text-gray-500 mb-1">내 추천코드</p>
                <p className="text-lg font-mono font-bold text-emerald-400 tracking-widest">{myCode}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
            <StatCard label="직추천" value={`${direct.length}명`} />
            <StatCard label="간추천" value={`${indirect.length}명`} />
            <StatCard label="전체 네트워크" value={`${direct.length + indirect.length}명`} />
            <StatCard label="네트워크 이달 매출" value={`₩${(totalNetworkSales / 10000).toFixed(0)}만`} color="text-yellow-400" />
          </div>

          {/* Direct Downline */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-white">직추천 하부</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{direct.length}명</span>
            </div>
            {direct.length === 0 ? (
              <p className="text-xs text-gray-600 py-4 text-center">직추천 하부 없음</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {direct.map(m => (
                  <MemberCard key={m.id} member={m} monthlySales={monthlySales} />
                ))}
              </div>
            )}
          </div>

          {/* Indirect Downline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-white">간추천 하부 (2단계)</h2>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{indirect.length}명</span>
            </div>
            {indirect.length === 0 ? (
              <p className="text-xs text-gray-600 py-4 text-center">간추천 하부 없음</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {indirect.map(m => (
                  <MemberCard key={m.id} member={m} monthlySales={monthlySales} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}