import { useState, useEffect } from "react";
import { Sales, Users, Auth } from "@/api/neonClient";
import SFCard from "@/components/SFCard";
import { Bell, DollarSign, UserPlus, TrendingUp, Award, Check, X } from "lucide-react";

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

function NotificationItem({ notification, onMarkRead, onDelete }) {
  const icons = {
    sale: DollarSign,
    lead: UserPlus,
    milestone: Award,
    system: Bell
  };
  
  const Icon = icons[notification.type] || Bell;
  
  const colors = {
    sale: 'text-emerald-400 bg-emerald-500/10',
    lead: 'text-sky-400 bg-sky-500/10',
    milestone: 'text-amber-400 bg-amber-500/10',
    system: 'text-purple-400 bg-purple-500/10'
  };
  
  const colorClass = colors[notification.type] || 'text-gray-400 bg-gray-500/10';
  
  return (
    <div className={`bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 transition-colors ${
      !notification.read ? 'border-emerald-500/20 bg-emerald-500/5' : ''
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white">
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
          
          <p className="text-xs text-gray-400 mb-2">{notification.message}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-600">
              {new Date(notification.created_at).toLocaleString('ko-KR')}
            </span>
            
            <div className="flex items-center gap-1">
              {!notification.read && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  className="px-2 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                >
                  읽음
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, sale, lead
  const currentUser = Auth.getUserId();
  
  useEffect(() => {
    loadNotifications();
    
    // 30초마다 새 알림 체크
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const loadNotifications = async () => {
    let timeout;
    try {
      timeout = setTimeout(() => {
        console.error('Notifications loading timeout');
        setLoading(false);
      }, 10000);
      
      // 실제 알림 데이터는 별도 테이블에서 가져오지만,
      // 임시로 최근 매출을 알림으로 표시
      const [allSales, allUsers] = await Promise.all([
        Sales.list().catch(() => []),
        Users.list().catch(() => [])
      ]);
      
      clearTimeout(timeout);
      
      const me = allUsers.find(u => u.id === currentUser);
      const myName = me?.name || Auth.getDealerName();
      
      // 최근 매출을 알림으로 변환
      const recentSales = (allSales || [])
        .filter(s => s.dealer_name === myName || s.caller_name === myName)
        .sort((a, b) => (b.created_at || b.sale_date).localeCompare(a.created_at || a.sale_date))
        .slice(0, 20)
        .map(s => ({
          id: `sale_${s.id}`,
          type: 'sale',
          title: '💰 신규 매출 등록',
          message: `${s.customer_name}님 - ₩${(s.amount || 0).toLocaleString()}`,
          created_at: s.created_at || s.sale_date,
          read: false
        }));
      
      // 마일스톤 알림 생성 (예: 누적 매출 달성)
      const totalSales = allSales
        .filter(s => s.dealer_name === myName || s.caller_name === myName)
        .reduce((sum, s) => sum + (s.amount || 0), 0);
      
      const milestones = [];
      if (totalSales >= 10000000 && totalSales < 10050000) {
        milestones.push({
          id: 'milestone_10m',
          type: 'milestone',
          title: '🎉 1,000만원 돌파!',
          message: `축하합니다! 누적 매출 ₩${totalSales.toLocaleString()} 달성`,
          created_at: new Date().toISOString(),
          read: false
        });
      }
      
      const allNotifications = [...milestones, ...recentSales];
      setNotifications(allNotifications);
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to load notifications:', error);
      clearTimeout(timeout);
      setLoading(false);
    }
  };
  
  const handleMarkRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };
  
  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'sale') return n.type === 'sale';
    if (filter === 'lead') return n.type === 'lead';
    return true;
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (loading) return (
    <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
      <Loader />
    </div>
  );
  
  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-[#080a12]/95 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-white">🔔 알림 센터</h1>
            <p className="text-[10px] text-gray-500">
              읽지 않은 알림 {unreadCount}개
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              모두 읽음
            </button>
          )}
        </div>
        
        {/* 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: '전체', count: notifications.length },
            { value: 'unread', label: '안읽음', count: unreadCount },
            { value: 'sale', label: '매출', count: notifications.filter(n => n.type === 'sale').length },
            { value: 'lead', label: '리드', count: notifications.filter(n => n.type === 'lead').length }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                filter === f.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]'
              }`}
            >
              {f.label} <span className="text-[10px] opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* 알림 목록 */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">알림이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
