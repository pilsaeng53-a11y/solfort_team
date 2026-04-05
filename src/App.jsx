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
import AdminDealer from './pages/AdminDealer';
import AdminCall from './pages/AdminCall';
import AdminSuper from './pages/AdminSuper';

const HIDE_NAV = ['/', '/call', '/admin/dealer', '/admin/call', '/admin/super'];

const AppContent = () => {
  const location = useLocation();
  const showNav = !HIDE_NAV.includes(location.pathname);
  return (
    <>
      <div className={showNav ? "pb-20" : ""}>
        <Routes>
          <Route path="/" element={<AuthLogin />} />

          {/* 딜러 */}
          <Route path="/dashboard" element={<ProtectedRoute roles={['dealer']}><Dashboard /></ProtectedRoute>} />
          <Route path="/register" element={<ProtectedRoute roles={['dealer']}><RegisterCustomer /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute roles={['dealer']}><ViewRecords /></ProtectedRoute>} />
          <Route path="/daily" element={<ProtectedRoute roles={['dealer']}><DailySales /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute roles={['dealer']}><SalesRanking /></ProtectedRoute>} />
          <Route path="/academy" element={<ProtectedRoute roles={['dealer']}><Academy /></ProtectedRoute>} />
          <Route path="/notices" element={<ProtectedRoute roles={['dealer']}><Announcements /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute roles={['dealer']}><Account /></ProtectedRoute>} />

          {/* 콜팀 */}
          <Route path="/call" element={<ProtectedRoute roles={['call_team']}><CallTeam /></ProtectedRoute>} />

          {/* 관리자 */}
          <Route path="/admin/dealer" element={<ProtectedRoute roles={['dealer_admin','super_admin']}><AdminDealer /></ProtectedRoute>} />
          <Route path="/admin/call" element={<ProtectedRoute roles={['call_admin','super_admin']}><AdminCall /></ProtectedRoute>} />
          <Route path="/admin/super" element={<ProtectedRoute roles={['super_admin']}><AdminSuper /></ProtectedRoute>} />

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