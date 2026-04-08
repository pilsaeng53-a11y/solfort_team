import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Toaster } from "@/components/ui/toaster";
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
import IncentiveSettings from './pages/IncentiveSettings';
import TelegramBot from './pages/TelegramBot';
import MyNetwork from './pages/MyNetwork';
import TeamManagement from './pages/TeamManagement';
import LeadDistribution from './pages/LeadDistribution';
import MonthlyReport from './pages/MonthlyReport';
import SalesSettlement from './pages/SalesSettlement';
import LeadExcelUpload from './pages/LeadExcelUpload';
import Register from './pages/Register';
import InitAdmin from './pages/InitAdmin';
import FoundationLinks from './pages/FoundationLinks';
import DailyJournal from './pages/DailyJournal';
import CustomerSatisfaction from './pages/CustomerSatisfaction';
import ReferralCode from './pages/ReferralCode';
import MySalesExcel from './pages/MySalesExcel';

const HIDE_NAV = ['/', '/call', '/admin/dealer', '/admin/call', '/admin/super', '/manager', '/call/dashboard', '/call/leads', '/call/queue', '/call/logs', '/call/interest', '/call/convert', '/call/scripts', '/call/ai'];

const AppContent = () => {
  const location = useLocation();
  const showNav = !HIDE_NAV.includes(location.pathname);
  const [showWelcome, setShowWelcome] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('sf_user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      if (currentUser && currentUser.role !== 'super_admin' && currentUser.status === 'active') {
        const welcomeKey = 'sf_welcome_' + currentUser.id;
        if (!localStorage.getItem(welcomeKey)) {
          setUser(currentUser);
          setShowWelcome(true);
        }
      }
    }
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

          {/* ëë¬ */}
          <Route path="/dashboard" element={<ProtectedRoute roles={['dealer']}><Dashboard /></ProtectedRoute>} />
          <Route path="/register" element={<ProtectedRoute roles={['dealer']}><RegisterCustomer /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute roles={['dealer']}><ViewRecords /></ProtectedRoute>} />
          <Route path="/daily" element={<ProtectedRoute roles={['dealer']}><DailySales /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute roles={['dealer']}><SalesRanking /></ProtectedRoute>} />
          <Route path="/academy" element={<ProtectedRoute roles={['dealer']}><Academy /></ProtectedRoute>} />
          <Route path="/notices" element={<ProtectedRoute roles={['dealer']}><Announcements /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute roles={['dealer']}><Account /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute roles={['dealer', 'call_team', 'dealer_admin', 'call_admin', 'super_admin']}><CalendarView /></ProtectedRoute>} />

          {/* ì½í */}
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

          {/* ê´ë¦¬ì ë° ë§¤ëì  */}
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
          <Route path="/incentive-settings" element={<ProtectedRoute roles={['call_team','dealer','super_admin']}><IncentiveSettings /></ProtectedRoute>} />
          <Route path="/lead-upload" element={<ProtectedRoute roles={['call_team','dealer','super_admin']}><LeadExcelUpload /></ProtectedRoute>} />
          <Route path="/telegram-bot" element={<ProtectedRoute roles={['super_admin']}><TelegramBot /></ProtectedRoute>} />
          <Route path="/my-network" element={<ProtectedRoute roles={['dealer','call_team','online_team','manager','dealer_admin','call_admin','super_admin']}><MyNetwork /></ProtectedRoute>} />
          <Route path="/team-management" element={<ProtectedRoute roles={['dealer','call_team','dealer_admin','call_admin','super_admin']}><TeamManagement /></ProtectedRoute>} />
          <Route path="/lead-distribution" element={<ProtectedRoute roles={['call_admin','super_admin']}><LeadDistribution /></ProtectedRoute>} />
          <Route path="/monthly-report" element={<ProtectedRoute roles={['super_admin']}><MonthlyReport /></ProtectedRoute>} />
          <Route path="/sales-settlement" element={<ProtectedRoute roles={['super_admin','dealer_admin']}><SalesSettlement /></ProtectedRoute>} />
          <Route path="/foundation" element={<ProtectedRoute roles={['dealer','call_team','online_team','manager','dealer_admin','call_admin','super_admin']}><FoundationLinks /></ProtectedRoute>} />
          <Route path="/daily-journal" element={<ProtectedRoute roles={['dealer','call_team','online_team','manager','dealer_admin','call_admin','super_admin']}><DailyJournal /></ProtectedRoute>} />
          <Route path="/satisfaction" element={<ProtectedRoute roles={['super_admin','manager']}><CustomerSatisfaction /></ProtectedRoute>} />
          <Route path="/my-sales-excel" element={<ProtectedRoute roles={['dealer','call_team','online_team','manager','dealer_admin','call_admin','super_admin','online_director']}><MySalesExcel /></ProtectedRoute>} />
              <Route path="/referral-code" element={<ProtectedRoute roles={['dealer','call_team','online_team','manager','dealer_admin','call_admin','super_admin']}><ReferralCode /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-[#0a0c15] border border-emerald-500/30 rounded-2xl p-6 max-w-sm text-center space-y-4">
            <p className="text-2xl">ð</p>
            <h2 className="text-lg font-bold text-white">ê°ìì´ ì¹ì¸ëììµëë¤!</h2>
            <p className="text-sm text-gray-400">SolFort ìë¹ì¤ë¥¼ ì´ì©íì¤ ì ììµëë¤.</p>
            <button
              onClick={handleWelcomeClose}
              className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl font-semibold hover:bg-emerald-500/30 transition-all"
            >
              ììíê¸°
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