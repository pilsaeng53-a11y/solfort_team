import { useState, useEffect } from "react";
import { Auth, Incentives, Sales, Users } from "@/api/neonClient";
import SFCard from "@/components/SFCard";

const LEADER_POSITIONS = ["콜지사장", "대리점지사장"];

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

function MyIncentiveCard({ userId, userName }) {
  const [setting, setSetting] = useState(null);
  const [monthlySales, setMonthlySales] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    let timeout;
    (async () => {
      try {
        // 10초 타임아웃 설정
        timeout = setTimeout(() => {
          console.error('Incentive data loading timeout');
          setLoading(false);
        }, 10000);

        const [allIncentives, allSales] = await Promise.all([
          Incentives.list().catch(() => []),
          Sales.list().catch(() => []),
        ]);

        clearTimeout(timeout);

        // 클라이언트 측 필터링
        const userIncentives = (allIncentives || []).filter(s => s.member_id === userId);
        const settings = userIncentives.sort((a, b) => 
          (b.set_at || '').localeCompare(a.set_at || '')
        ).slice(0, 1);
        
        const current = settings[0] || null;
        setSetting(current);
        
        const thisMonthSales = (allSales || [])
          .filter(s => s.dealer_name === Auth.getDealerName() && (s.sale_date || "").startsWith(thisMonth))
          .reduce((a, s) => a + (s.sales_amount || 0), 0);
        setMonthlySales(thisMonthSales);
        
        const allSettings = userIncentives.sort((a, b) => 
          (b.set_at || '').localeCompare(a.set_at || '')
        ).slice(0, 20);
        setHistory(allSettings);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load incentive data:', error);
        clearTimeout(timeout);
        setLoading(false);
      }
    })();
    
    return () => clearTimeout(timeout);
  }, [userId, thisMonth]);

  if (loading) return <Loader />;

  const rate = setting?.rate_percent || 0;
  const estimated = Math.round(monthlySales * rate / 100);

  return (
    <SFCard className="mb-6">
      <h3 className="text-sm font-semibold text-emerald-400 mb-4">💰 내 인센티브 현황</h3>
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-[10px] text-gray-500 mb-1">현재 요율</p>
          <p className="text-4xl font-bold text-emerald-400">{rate}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 mb-1">이달 예상 인센티브</p>
          <p className="text-xl font-bold text-white">₩{estimated.toLocaleString()}</p>
          <p className="text-[10px] text-gray-600">이달 매출 ₩{monthlySales.toLocaleString()} × {rate}%</p>
        </div>
      </div>

      {history.length > 0 && (
        <>
          <h4 className="text-xs text-gray-500 font-semibold mb-2 mt-4">요율 변경 내역</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-white/[0.06]">
                  <th className="text-left py-2 px-2">설정일시</th>
                  <th className="text-left py-2 px-2">요율</th>
                  <th className="text-left py-2 px-2">설정자</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-white/[0.04]">
                    <td className="py-2 px-2 text-gray-500">{(h.set_at || "").replace("T", " ").substring(0, 16)}</td>
                    <td className="py-2 px-2 text-emerald-400 font-semibold">{h.rate_percent}%</td>
                    <td className="py-2 px-2 text-gray-400">{h.set_by_name || h.set_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SFCard>
  );
}

function MemberRateRow({ member, setByUsername, setByName }) {
  const [rate, setRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Incentives.list()
      .then(all => {
        const userSettings = (all || []).filter(s => s.member_id === member.id);
        const latest = userSettings.sort((a, b) => 
          (b.set_at || '').localeCompare(a.set_at || '')
        )[0];
        if (latest) setRate(latest.rate_percent);
      })
      .catch(() => {});
  }, [member.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const month = now.slice(0, 7);
      await Incentives.create({
        member_id: member.id,
        member_name: member.name || member.dealer_name || member.owner_name,
        member_username: member.username,
        rate_percent: rate,
        set_by: setByUsername,
        set_by_name: setByName,
        set_at: now,
        month,
      });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save incentive setting:', error);
      setSaving(false);
    }
  };

  const memberName = member.name || member.dealer_name || member.owner_name || member.username;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/[0.06] last:border-0">
      <div className="w-24 shrink-0">
        <p className="text-xs text-white font-medium truncate">{memberName}</p>
        <p className="text-[10px] text-gray-600">{member.position || member.role || "-"}</p>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={30}
          step={0.5}
          value={rate}
          onChange={e => setRate(parseFloat(e.target.value))}
          className="flex-1 h-1.5 accent-emerald-400 cursor-pointer"
        />
        <span className="text-emerald-400 font-bold text-sm w-12 text-right">{rate}%</span>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
          saved
            ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
        }`}
      >
        {saved ? "✓ 저장됨" : saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}

function TeamIncentivePanel({ currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeout;
    (async () => {
      try {
        timeout = setTimeout(() => {
          console.error('Team data loading timeout');
          setLoading(false);
        }, 10000);

        const allUsers = await Users.list().catch(() => []);
        clearTimeout(timeout);

        // parent_dealer_id로 필터링
        const myTeam = (allUsers || []).filter(m => 
          m.parent_dealer_id === currentUser.id && m.status === "active"
        );
        setMembers(myTeam);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load team data:', error);
        clearTimeout(timeout);
        setLoading(false);
      }
    })();
    
    return () => clearTimeout(timeout);
  }, [currentUser.id]);

  if (loading) return <Loader />;

  return (
    <SFCard className="mb-6">
      <h3 className="text-sm font-semibold text-emerald-400 mb-1">👥 팀원 인센티브 요율 설정</h3>
      <p className="text-[10px] text-gray-600 mb-4">팀원 {members.length}명</p>
      {members.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-6">연결된 팀원이 없습니다</p>
      ) : (
        members.map(m => (
          <MemberRateRow
            key={m.id}
            member={m}
            setByUsername={currentUser.username}
            setByName={currentUser.name || currentUser.dealer_name}
          />
        ))
      )}
    </SFCard>
  );
}

export default function IncentiveSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeout;
    (async () => {
      try {
        const userId = Auth.getUserId();
        const role = Auth.getRole();
        
        timeout = setTimeout(() => {
          console.error('User data loading timeout');
          setCurrentUser({ 
            id: userId, 
            username: Auth.getDealerName(), 
            name: Auth.getDealerName(), 
            position: "" 
          });
          setLoading(false);
        }, 10000);

        const allUsers = await Users.list().catch(() => []);
        clearTimeout(timeout);

        const me = (allUsers || []).find(m => 
          m.id === userId || 
          m.username === Auth.getDealerName() || 
          m.dealer_name === Auth.getDealerName()
        );
        setCurrentUser(me || { 
          id: userId, 
          username: Auth.getDealerName(), 
          name: Auth.getDealerName(), 
          position: "" 
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
        clearTimeout(timeout);
        const userId = Auth.getUserId();
        setCurrentUser({ 
          id: userId, 
          username: Auth.getDealerName(), 
          name: Auth.getDealerName(), 
          position: "" 
        });
        setLoading(false);
      }
    })();
    
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
      <Loader />
    </div>
  );

  const isLeader = LEADER_POSITIONS.includes(currentUser?.position);

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      <div className="sticky top-0 z-20 bg-[#080a12]/95 border-b border-white/[0.06] px-4 py-3">
        <h1 className="text-base font-bold text-white">💸 인센티브 설정</h1>
        <p className="text-[10px] text-gray-500">{currentUser?.position || Auth.getRole()}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        <MyIncentiveCard userId={currentUser?.id} userName={currentUser?.name || currentUser?.dealer_name} />
        {isLeader && <TeamIncentivePanel currentUser={currentUser} />}
      </div>
    </div>
  );
}