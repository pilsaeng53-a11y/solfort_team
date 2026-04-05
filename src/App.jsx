import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
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
import AdminDealer from './pages/AdminDealer';
import AdminCall from './pages/AdminCall';
import AdminSuper from './pages/AdminSuper';
import ManagerPage from './pages/ManagerPage';
import Register from './pages/Register';
import InitAdmin from './pages/InitAdmin';

const HIDE_NAV = ['/', '/call', '/admin/dealer', '/admin/call', '/admin/super', '/manager', '/call/dashboard', '/call/leads', '/call/queue', '/call/logs', '/call/interest', '/call/convert', '/call/scripts', '/call/ai'];

const AppContent = () => {
  const location = useLocation();
  const showNav = !HIDE_NAV.includes(location.pathname);
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
          </Route>

          {/* 관리자 및 매니저 */}
          <Route path="/admin/dealer" element={<ProtectedRoute roles={['dealer_admin','super_admin']}><AdminDealer /></ProtectedRoute>} />
          <Route path="/admin/call" element={<ProtectedRoute roles={['call_admin','super_admin']}><AdminCall /></ProtectedRoute>} />
          <Route path="/admin/super" element={<ProtectedRoute roles={['super_admin']}><AdminSuper /></ProtectedRoute>} />
          <Route path="/manager" element={<ProtectedRoute roles={['manager']}><ManagerPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
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