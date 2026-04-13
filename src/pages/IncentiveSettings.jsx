import { useState, useEffect } from "react";
import { Auth, Incentives, Sales, Users } from "@/api/neonClient";
import SFCard from "@/components/SFCard";

const LEADER_POSITIONS = ["콜지사장", "대리점지사장"];
const ADMIN_ROLES = ["super_admin", "online_director"];

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

// 1️⃣ 내 인센티브 현황
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
        timeout = setTimeout(() => {
          console.error('Incentive data loading timeout');
          setLoading(false);
        }, 10000);

        const [allIncentives, allSales] = await Promise.all([
          Incentives.list().catch(() => []),
          Sales.list().catch(() => []),
        ]);

        clearTimeout(timeout);

        const userIncentives = (allIncentives || []).filter(s => s.member_id === userId);
        const settings = userIncentives.sort((a, b) => 
          (b.set_at || '').localeCompare(a.set_at || '')
        ).slice(0, 1);
        
        const current = settings[0] || null;
        setSetting(current);
        
        const thisMonthSales = (allSales || [])
          .filter(s => s.dealer_name === userName && s.sale_date?.startsWith(thisMonth))
          .reduce((sum, s) => sum + (s.amount || 0), 0);
        setMonthlySales(thisMonthSales);

        const recentHistory = userIncentives.slice(0, 3);
        setHistory(recentHistory);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load incentive data:', error);
        clearTimeout(timeout);
        setLoading(false);
      }
    })();
    
    return () => clearTimeout(timeout);
  }, [userId, userName, thisMonth]);

  if (loading) return <Loader />;

  const currentRate = setting?.rate_percent || 0;
  const estimated = Math.round(monthlySales * currentRate / 100);

  return (
    <SFCard className="mb-4">
      <h2 className="text-sm font-bold text-white mb-4">💰 내 인센티브 현황</h2>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 mb-1">현재 요율</p>
          <p className="text-2xl font-bold text-sky-400">{currentRate}%</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 mb-1">이번달 매출</p>
          <p className="text-lg font-semibold text-white">₩{monthlySales.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 mb-1">예상 수령</p>
          <p className="text-lg font-bold text-emerald-400">₩{estimated.toLocaleString()}</p>
        </div>
      </div>

      {history.length > 0 && (
        <>
          <div className="h-px bg-white/[0.06] my-3" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
            📊 요율 변경 내역 (최근 3개월)
          </p>
          <div className="space-y-1.5">
            {history.map((h, i) => (
              <div key={i} className="text-xs text-gray-400">
                {h.month || h.set_at?.slice(0, 7)} → {h.rate_percent}% 
                <span className="text-gray-600 ml-1">(설정자: {h.set_by_name || '관리자'})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </SFCard>
  );
}

// 2️⃣ 팀원 요율 설정 (개별 행)
function MemberRateRow({ member, allIncentives, onSave }) {
  const [rate, setRate] = useState(0);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const memberSettings = (allIncentives || [])
      .filter(s => s.member_id === member.id)
      .sort((a, b) => (b.set_at || '').localeCompare(a.set_at || ''));
    const current = memberSettings[0];
    setRate(current?.rate_percent || 0);
  }, [member.id, allIncentives]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(member.id, member.name, rate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      alert('❌ 저장 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">
          {member.name} <span className="text-xs text-gray-500">({member.role})</span>
        </span>
        <span className="text-lg font-bold text-emerald-400">{rate}%</span>
      </div>
      
      <input
        type="range"
        min={0}
        max={30}
        step={0.5}
        value={rate}
        onChange={(e) => setRate(parseFloat(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
      
      <button
        onClick={handleSave}
        disabled={loading}
        className={`w-full mt-2 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        } disabled:opacity-60`}
      >
        {saved ? '✓ 저장됨' : loading ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

// 2️⃣ 팀원 인센티브 패널
function TeamIncentivePanel({ currentUser }) {
  const [team, setTeam] = useState([]);
  const [allIncentives, setAllIncentives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeout;
    (async () => {
      try {
        timeout = setTimeout(() => {
          console.error('Team data loading timeout');
          setLoading(false);
        }, 10000);

        const [allUsers, incentives] = await Promise.all([
          Users.list().catch(() => []),
          Incentives.list().catch(() => [])
        ]);

        clearTimeout(timeout);

        const myTeam = (allUsers || []).filter(u =>
          u.parent_dealer_id === currentUser.id && u.status === 'active'
        );
        
        setTeam(myTeam);
        setAllIncentives(incentives || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load team data:', error);
        clearTimeout(timeout);
        setLoading(false);
      }
    })();
    
    return () => clearTimeout(timeout);
  }, [currentUser.id]);

  const handleSaveRate = async (memberId, memberName, newRate) => {
    await Incentives.create({
      member_id: memberId,
      member_name: memberName,
      rate_percent: newRate,
      set_by: currentUser.username,
      set_by_name: currentUser.name,
      set_at: new Date().toISOString(),
      month: new Date().toISOString().slice(0, 7)
    });
    
    // 새로고침
    const updatedIncentives = await Incentives.list().catch(() => []);
    setAllIncentives(updatedIncentives);
  };

  if (loading) return <Loader />;
  if (team.length === 0) return null;

  return (
    <SFCard className="mb-4">
      <h2 className="text-sm font-bold text-white mb-3">
        👥 팀원 인센티브 요율 설정 <span className="text-gray-500 text-xs">({team.length}명)</span>
      </h2>
      
      {team.map(member => (
        <MemberRateRow
          key={member.id}
          member={member}
          allIncentives={allIncentives}
          onSave={handleSaveRate}
        />
      ))}
    </SFCard>
  );
}

// 3️⃣ 전체 인센티브 통계 (총관리자용)
function OverallStatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeout;
    (async () => {
      try {
        timeout = setTimeout(() => {
          console.error('Stats data loading timeout');
          setLoading(false);
        }, 10000);

        const [allSales, allIncentives, allUsers] = await Promise.all([
          Sales.list().catch(() => []),
          Incentives.list().catch(() => []),
          Users.list().catch(() => [])
        ]);

        clearTimeout(timeout);

        const thisMonth = new Date().toISOString().slice(0, 7);
        const thisMonthSales = (allSales || []).filter(s =>
          s.sale_date && s.sale_date.startsWith(thisMonth)
        );

        // 각 직원별 인센티브 계산
        const staffIncentives = (allUsers || []).map(user => {
          const userSales = thisMonthSales.filter(s =>
            s.dealer_name === user.name || s.caller_name === user.name
          );
          const salesTotal = userSales.reduce((sum, s) => sum + (s.amount || 0), 0);

          const userSettings = (allIncentives || [])
            .filter(i => i.member_id === user.id)
            .sort((a, b) => (b.set_at || '').localeCompare(a.set_at || ''));
          const rate = userSettings[0]?.rate_percent || 0;

          return {
            name: user.name,
            role: user.role,
            rate: rate,
            sales: salesTotal,
            incentive: Math.round(salesTotal * rate / 100)
          };
        });

        const totalIncentive = staffIncentives.reduce((sum, s) => sum + s.incentive, 0);
        const totalSales = thisMonthSales.reduce((sum, s) => sum + (s.amount || 0), 0);

        const callTeam = staffIncentives.filter(s =>
          s.role === 'call_team' || s.role === 'call_admin'
        );
        const dealers = staffIncentives.filter(s =>
          s.role === 'dealer' || s.role === 'dealer_admin'
        );

        const avgRate = (arr) =>
          arr.length > 0 ? arr.reduce((sum, s) => sum + s.rate, 0) / arr.length : 0;
        const sumIncentive = (arr) =>
          arr.reduce((sum, s) => sum + s.incentive, 0);

        setStats({
          total: totalIncentive,
          totalSales,
          percentage: totalSales > 0 ? ((totalIncentive / totalSales) * 100).toFixed(2) : 0,
          callTeam: {
            count: callTeam.length,
            avgRate: avgRate(callTeam).toFixed(1),
            total: sumIncentive(callTeam)
          },
          dealers: {
            count: dealers.length,
            avgRate: avgRate(dealers).toFixed(1),
            total: sumIncentive(dealers)
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Failed to load stats:', error);
        clearTimeout(timeout);
        setLoading(false);
      }
    })();

    return () => clearTimeout(timeout);
  }, []);

  if (loading) return <Loader />;
  if (!stats) return null;

  return (
    <SFCard className="mb-4">
      <h2 className="text-sm font-bold text-white mb-4">📊 이번달 인센티브 통계</h2>

      <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 mb-3">
        <p className="text-[10px] text-gray-500 mb-1">총 지급 예상액</p>
        <p className="text-3xl font-bold text-emerald-400">₩{stats.total.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1">
          (전체 매출 ₩{stats.totalSales.toLocaleString()}의 {stats.percentage}%)
        </p>
      </div>

      <div className="h-px bg-white/[0.06] my-3" />

      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
        📋 팀별 인센티브 현황
      </p>

      <div className="space-y-2">
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
          <p className="text-sm font-semibold text-white mb-1">
            콜팀 <span className="text-xs text-gray-500">({stats.callTeam.count}명)</span>
          </p>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">평균 요율: {stats.callTeam.avgRate}%</span>
            <span className="text-emerald-400 font-bold">₩{stats.callTeam.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
          <p className="text-sm font-semibold text-white mb-1">
            대리점 <span className="text-xs text-gray-500">({stats.dealers.count}명)</span>
          </p>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">평균 요율: {stats.dealers.avgRate}%</span>
            <span className="text-emerald-400 font-bold">₩{stats.dealers.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </SFCard>
  );
}

// 메인 컴포넌트
export default function IncentiveSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeout;
    (async () => {
      try {
        timeout = setTimeout(() => {
          console.error('User data loading timeout');
          const userId = Auth.getUserId();
          setCurrentUser({
            id: userId,
            username: Auth.getDealerName(),
            name: Auth.getDealerName(),
            position: "",
            role: Auth.getRole()
          });
          setLoading(false);
        }, 10000);

        const allUsers = await Users.list().catch(() => []);
        clearTimeout(timeout);

        const userId = Auth.getUserId();
        const me = allUsers.find(u => u.id === userId);

        setCurrentUser(me || {
          id: userId,
          username: Auth.getDealerName(),
          name: Auth.getDealerName(),
          position: "",
          role: Auth.getRole()
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
          position: "",
          role: Auth.getRole()
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
  const isAdmin = ADMIN_ROLES.includes(currentUser?.role);

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      <div className="sticky top-0 z-20 bg-[#080a12]/95 border-b border-white/[0.06] px-4 py-3">
        <h1 className="text-base font-bold text-white">💸 인센티브 설정</h1>
        <p className="text-[10px] text-gray-500">{currentUser?.position || currentUser?.role}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        {/* 1. 내 인센티브 (모두) */}
        <MyIncentiveCard userId={currentUser?.id} userName={currentUser?.name || currentUser?.dealer_name} />
        
        {/* 2. 팀원 설정 (팀장만) */}
        {isLeader && <TeamIncentivePanel currentUser={currentUser} />}
        
        {/* 3. 전체 통계 (총관리자만) */}
        {isAdmin && <OverallStatsPanel />}
      </div>
    </div>
  );
}
