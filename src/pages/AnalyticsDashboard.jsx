import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SFCard from '@/components/SFCard';
import StatCard from '@/components/StatCard';
import { TrendingUp, Users, Building2, Zap } from 'lucide-react';

export default function AnalyticsDashboard() {
  useEffect(() => { document.title = 'SolFort - 분석대시보드'; }, []);

  const [tab, setTab] = useState('all');
  const [sales, setSales] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, d] = await Promise.all([
        base44.entities.SalesRecord.list('-created_date', 1000),
        base44.entities.DealerInfo.filter({ status: 'active' }, '', 500),
      ]);
      setSales(s);
      setDealers(d);
      setLoading(false);
    };
    load();
  }, []);

  // Summary metrics
  const totalSales = sales.reduce((sum, s) => sum + (s.sales_amount || 0), 0);
  const totalCount = sales.length;
  const activeDealers = new Set(sales.map(s => s.dealer_name)).size;
  const activeCallTeams = new Set(sales.map(s => s.call_team).filter(Boolean)).size;

  // Monthly trend
  const monthlyData = {};
  sales.forEach(s => {
    if (s.sale_date) {
      const month = s.sale_date.substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + (s.sales_amount || 0);
    }
  });
  const monthlyChart = Object.entries(monthlyData)
    .sort()
    .map(([month, amount]) => ({ month, 매출: Math.round(amount) }));

  // By dealer
  const dealerData = {};
  sales.forEach(s => {
    if (s.dealer_name) {
      dealerData[s.dealer_name] = (dealerData[s.dealer_name] || 0) + (s.sales_amount || 0);
    }
  });
  const dealerChart = Object.entries(dealerData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, amount]) => ({ name: name.substring(0, 12), 매출: Math.round(amount) }));

  // By call team
  const teamData = {};
  sales.forEach(s => {
    const team = s.call_team || '미지정';
    teamData[team] = (teamData[team] || 0) + (s.sales_amount || 0);
  });
  const teamChart = Object.entries(teamData)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name: name.substring(0, 12), 매출: Math.round(amount) }));

  // By region
  const regionData = {};
  dealers.forEach(d => {
    const region = d.region || '미지정';
    regionData[region] = (regionData[region] || 0) + 1;
  });
  const regionChart = Object.entries(regionData)
    .map(([region, count]) => ({ region, 대리점수: count }));

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-[#080a12] px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">분석대시보드</h1>
            <p className="text-sm text-gray-500">전사 매출 및 실적 분석</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="총 매출"
            value={`₩${(totalSales / 10000000).toFixed(1)}천만`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="총 건수"
            value={totalCount}
            icon={<Zap className="h-4 w-4" />}
          />
          <StatCard
            label="활동 딜러"
            value={activeDealers}
            icon={<Building2 className="h-4 w-4" />}
          />
          <StatCard
            label="활동 콜팀"
            value={activeCallTeams}
            icon={<Users className="h-4 w-4" />}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[['all', '전체'], ['dealer', '대리점별'], ['team', '콜팀별'], ['region', '지점별']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === v
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ALL TAB */}
            {tab === 'all' && (
              <div className="space-y-6">
                {/* Monthly Trend */}
                <SFCard>
                  <p className="text-sm font-semibold text-white mb-4">📈 월별 매출 추이</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="매출" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </SFCard>

                {/* By Dealer */}
                <SFCard>
                  <p className="text-sm font-semibold text-white mb-4">🏪 대리점별 매출</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dealerChart} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" stroke="#999" />
                      <YAxis dataKey="name" type="category" stroke="#999" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey="매출" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </SFCard>

                {/* By Team */}
                {teamChart.length > 0 && (
                  <SFCard>
                    <p className="text-sm font-semibold text-white mb-4">📞 콜팀별 실적</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={teamChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="#999" angle={-45} height={80} />
                        <YAxis stroke="#999" />
                        <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Bar dataKey="매출" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SFCard>
                )}

                {/* Organization */}
                <SFCard>
                  <p className="text-sm font-semibold text-white mb-4">🗺️ 지역별 조직도</p>
                  <div className="space-y-3">
                    {regionChart.map(r => (
                      <div key={r.region} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                          <p className="text-sm font-medium text-white">{r.region}</p>
                        </div>
                        <span className="text-lg font-bold text-blue-400">{r.대리점수}</span>
                      </div>
                    ))}
                  </div>
                </SFCard>
              </div>
            )}

            {/* DEALER TAB */}
            {tab === 'dealer' && (
              <div className="space-y-6">
                <SFCard>
                  <p className="text-sm font-semibold text-white mb-4">🏪 대리점별 매출</p>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dealerChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#999" angle={-45} height={100} />
                      <YAxis stroke="#999" />
                      <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey="매출" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </SFCard>
              </div>
            )}

            {/* TEAM TAB */}
            {tab === 'team' && teamChart.length > 0 && (
              <div className="space-y-6">
                <SFCard>
                  <p className="text-sm font-semibold text-white mb-4">📞 콜팀별 실적</p>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={teamChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey="매출" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </SFCard>
              </div>
            )}

            {/* REGION TAB */}
            {tab === 'region' && (
              <div className="space-y-6">
                <SFCard>
                  <p className="text-sm font-semibold text-white mb-4">🗺️ 지역별 대리점 현황</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={regionChart}
                            dataKey="대리점수"
                            nameKey="region"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {regionChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {regionChart.map((r, idx) => (
                        <div key={r.region} className="flex items-center gap-2 p-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                          <span className="text-sm text-gray-300">{r.region}</span>
                          <span className="ml-auto font-bold text-white">{r.대리점수}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SFCard>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}