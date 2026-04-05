import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Toaster } from "@/components/ui/toaster";
import BottomNav from '@/components/BottomNav';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import RegisterCustomer from './pages/RegisterCustomer';
import ViewRecords from './pages/ViewRecords';
import DailySales from './pages/DailySales';
import Academy from './pages/Academy';
import Announcements from './pages/Announcements';
import Account from './pages/Account';
import SalesRanking from './pages/SalesRanking';

const HIDE_NAV = ['/'];

const AppContent = () => {
  const location = useLocation();
  const showNav = !HIDE_NAV.includes(location.pathname);
  return (
    <>
      <div className={showNav ? "pb-20" : ""}>
        <Routes>
          <Route path="/" element={<Setup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<RegisterCustomer />} />
          <Route path="/records" element={<ViewRecords />} />
          <Route path="/daily" element={<DailySales />} />
          <Route path="/ranking" element={<SalesRanking />} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/notices" element={<Announcements />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Setup />} />
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