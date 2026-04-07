import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Toaster } from "@/components/ui/toaster";
import { base44 } from '@/api/base44Client';
import BottomNav from '@/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Auth } from '@/lib/auth';
import AuthLogin from './pages/AuthLogin';
import Dashboard from './pages/Dashboard';
import RegisterCustomer from './pages/RegisterCustomer';
import ViewRecords from './pages/ViewRecords';
import DailySales from './pages/DailySales';
import Academy from './pages/Academy';
import Announcements from './pages/Announcements';
import Account from './pages/Account';
import SalesRanking from './pages/SalesRanking';
import CallTeam from './pages/CallTeam';
import CallLayout from './components/CallLayout';
import CallDashboard from './pages/CallDashboard';
import CallLeads from './pages/CallLeads';
import CallLogs from './pages/CallLogs';
import CallInterest from './pages/CallInterest';
import CallConvert from './pages/CallConvert';
import CallScripts from './pages/CallScripts';
import CallQueuePage from './pages/CallQueuePage';
import CallAI from './pages/CallAI';
import CalendarView from './pages/CalendarView';
import CallCompetition from './pages/CallCompetition';
import AdminDealer from './pages/AdminDealer';
import AdminCall from './pages/AdminCall';
import AdminSuper from './pages/AdminSuper';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ManagerPage from './pages/ManagerPage';
import OnlineDirector from './pages/OnlineDirector';
import OnlineDashboard from './pages/OnlineDashboard';
import OnlinePerformance from './pages/OnlinePerformance';
import OnlineRegister from './pages/OnlineRegister';
import OnlineAds from './pages/OnlineAds';
import Register from './pages/Register';
import InitAdmin from './pages/InitAdmin';

const HIDE_NAV = ['/', '/call', '/admin/dealer', '/admin/call', '/admin/super', '/manager', '/call/dashboard', '/call/leads', '/call/queue', '/call/logs', '/call/interest', '/call/convert', '/call/scripts', '/call/ai'];

const AppContent = () => {
  const location = useLocation();
  const showNav = !HIDE_NAV.includes(location.pathname);
  const [showWelcome, setShowWelcome] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser && currentUser.role !== 'super_admin') {
          const dealers = await base44.entities.DealerInfo.list();
          const dealer = dealers.find(d => d.id === currentUser.user_id || d.username === currentUser.username);
          if (dealer && dealer.status === 'active') {
            const welcomeKey = 'sf_welcome_' + (currentUser.user_id || dealer.id);
            if (!localStorage.getItem(welcomeKey)) {
              setUser(currentUser);
              setShowWelcome(true);
            }
          }
        }
      } catch (e) { }
    };
    checkWelcome();
  }, [location]);

  const handleWelcomeClose = () => {
    if (user) {
      const welcomeKey = 'sf_welcome_' + (user.user_id || user.id);
      localStorage.setItem(welcomeKey, 'true');
    }
    setShowWelcome(false);
  };
  return (
    <>
      <div className={showNav ? "pb-20" : ""}>
        <Routes>
          <Route path="/" element={<AuthLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/init-admin" element={<InitAdmin />} />

          {/* 딜러 */}
          <Route path="/dashboard" element={<ProtectedRoute roles={['dealer']}><Dashboard /></ProtectedRoute>} />
          <Route path="/register" element={<ProtectedRoute roles={['dealer']}><RegisterCustomer /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute roles={['dealer']}><ViewRecords /></ProtectedRoute>} />
          <Route path="/daily" element={<ProtectedRoute roles={['dealer']}><DailySales /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute roles={['dealer']}><SalesRanking /></ProtectedRoute>} />
          <Route path="/academy" element={<ProtectedRoute roles={['dealer']}><Academy /></ProtectedRoute>} />
          <Route path="/notices" element={<ProtectedRoute roles={['dealer']}><Announcements /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute roles={['dealer']}><Account /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute roles={['dealer', 'call_team', 'dealer_admin', 'call_admin', 'super_admin']}><CalendarView /></ProtectedRoute>} />

          {/* 콜팀 */}
          <Route path="/call" element={<ProtectedRoute roles={['call_team']}><CallTeam /></ProtectedRoute>} />
          <Route element={<ProtectedRoute roles={['call_team','call_admin','super_admin']}><CallLayout /></ProtectedRoute>}>
            <Route path="/call/dashboard" element={<CallDashboard />} />
            <Route path="/call/leads" element={<CallLeads />} />
            <Route path="/call/logs" element={<CallLogs />} />
            <Route path="/call/interest" element={<CallInterest />} />
            <Route path="/call/convert" element={<CallConvert />} />
            <Route path="/call/scripts" element={<CallScripts />} />
            <Route path="/call/queue" element={<CallQueuePage />} />
            <Route path="/call/ai" element={<CallAI />} />
            <Route path="/call/competition" element={<CallCompetition />} />
          </Route>

          {/* 관리자 및 매니저 */}
          <Route path="/admin/dealer" element={<ProtectedRoute roles={['dealer_admin','super_admin']}><AdminDealer /></ProtectedRoute>} />
          <Route path="/admin/call" element={<ProtectedRoute roles={['call_admin','super_admin']}><AdminCall /></ProtectedRoute>} />
          <Route path="/admin/super" element={<ProtectedRoute roles={['super_admin']}><AdminSuper /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute roles={['super_admin','dealer_admin','call_admin']}><AnalyticsDashboard /></ProtectedRoute>} />
          <Route path="/online-director" element={<ProtectedRoute roles={['super_admin','online_director']}><OnlineDirector /></ProtectedRoute>} />
          <Route path="/online/dashboard" element={<ProtectedRoute roles={['online_team','online_director','super_admin']}><OnlineDashboard /></ProtectedRoute>} />
          <Route path="/online/performance" element={<ProtectedRoute roles={['online_team','online_director','super_admin']}><OnlinePerformance /></ProtectedRoute>} />
          <Route path="/online/register" element={<ProtectedRoute roles={['online_team','online_director','super_admin']}><OnlineRegister /></ProtectedRoute>} />
          <Route path="/online/ads" element={<ProtectedRoute roles={['online_team','online_director','super_admin']}><OnlineAds /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute roles={['manager']}><ManagerPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-[#0a0c15] border border-emerald-500/30 rounded-2xl p-6 max-w-sm text-center space-y-4">
            <p className="text-2xl">🎉</p>
            <h2 className="text-lg font-bold text-white">가입이 승인되었습니다!</h2>
            <p className="text-sm text-gray-400">SolFort 서비스를 이용하실 수 있습니다.</p>
            <button
              onClick={handleWelcomeClose}
              className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl font-semibold hover:bg-emerald-500/30 transition-all"
            >
              시작하기
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AppContent />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}