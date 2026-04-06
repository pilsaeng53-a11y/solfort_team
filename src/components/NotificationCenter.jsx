import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        userRef.current = currentUser;
        setUser(currentUser);
        await loadNotifications(currentUser);
      } catch (e) {}
      setLoading(false);
    };
    init();
    const timer = setInterval(() => {
      if (userRef.current) loadNotifications(userRef.current);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const loadNotifications = async (currentUser) => {
    try {
      const readIds = JSON.parse(localStorage.getItem("sf_notif_read") || "{}");
      const notifs = [];
      if (!currentUser) return;

      const today = new Date().toISOString().split("T")[0];

      // Dealer
      if (currentUser.role === "dealer") {
        const dealers = await base44.entities.DealerInfo.filter({ username: currentUser.username });
        if (dealers.length > 0) {
          const dealer = dealers[0];
          if (dealer.status === "active") {
            notifs.push({ id: `dealer_approved_${dealer.id}`, icon: "✅", message: "계정이 승인되었습니다.", time: dealer.updated_date || dealer.created_date, type: "approval" });
          } else if (dealer.status === "pending") {
            notifs.push({ id: `dealer_pending_${dealer.id}`, icon: "⏳", message: "계정 승인 대기 중입니다.", time: dealer.created_date, type: "pending" });
          }
          const dispatches = await base44.entities.MeetingDispatchRequest.filter({ target_dealer_name: dealer.dealer_name }, "-requested_at", 50);
          dispatches.forEach(r => {
            const statusIcon = r.status === "pending" ? "📤" : r.status === "accepted" ? "✅" : "❌";
            const statusLabel = r.status === "pending" ? "대기" : r.status === "accepted" ? "수락됨" : "거절됨";
            notifs.push({ id: `dispatch_${r.id}`, icon: statusIcon, message: `파견요청: ${r.customer_name} (${statusLabel})`, time: r.requested_at, type: "dispatch" });
          });
        }
      }

      // Call Team
      if (currentUser.role === "call_team") {
        const members = await base44.entities.CallTeamMember.filter({ username: currentUser.username });
        if (members.length > 0) {
          const member = members[0];
          if (member.status === "active") {
            notifs.push({ id: `member_approved_${member.id}`, icon: "✅", message: "계정이 승인되었습니다.", time: member.updated_date || member.created_date, type: "approval" });
          } else if (member.status === "pending") {
            notifs.push({ id: `member_pending_${member.id}`, icon: "⏳", message: "계정 승인 대기 중입니다.", time: member.created_date, type: "pending" });
          }
        }
        const myDispatches = await base44.entities.MeetingDispatchRequest.filter({ caller_name: currentUser.username }, "-requested_at", 30);
        myDispatches.forEach(r => {
          const statusIcon = r.status === "pending" ? "📤" : r.status === "accepted" ? "✅" : "❌";
          const statusLabel = r.status === "accepted" ? "수락" : r.status === "rejected" ? "거절" : "대기";
          notifs.push({ id: `dispatch_status_${r.id}`, icon: statusIcon, message: `파견요청 ${statusLabel}: ${r.customer_name}`, time: r.requested_at, type: "dispatch" });
        });
      }

      // Dealer Admin
      if (currentUser.role === "dealer_admin") {
        const pendingDealers = await base44.entities.DealerInfo.filter({ status: "pending" });
        pendingDealers.forEach(d => notifs.push({ id: `pending_dealer_${d.id}`, icon: "👤", message: `${d.dealer_name} 딜러 승인 대기`, time: d.created_date, type: "pending_approval" }));
      }

      // Call Admin
      if (currentUser.role === "call_admin") {
        const pendingMembers = await base44.entities.CallTeamMember.filter({ status: "pending" });
        pendingMembers.forEach(m => notifs.push({ id: `pending_member_${m.id}`, icon: "👤", message: `${m.name} 콜팀원 승인 대기`, time: m.created_date, type: "pending_approval" }));
      }

      // Super Admin
      if (currentUser.role === "super_admin") {
        const [pendingDealers, pendingMembers, pendingOnline, allDealers, allMembers, dispatchReqs] = await Promise.all([
          base44.entities.DealerInfo.filter({ status: "pending" }),
          base44.entities.CallTeamMember.filter({ status: "pending" }),
          base44.entities.OnlineTeamMember.filter({ status: "pending" }),
          base44.entities.DealerInfo.list("-created_date", 100),
          base44.entities.CallTeamMember.list("-created_date", 100),
          base44.entities.MeetingDispatchRequest.filter({ status: "pending" }, "-requested_at", 50),
        ]);

        pendingDealers.forEach(d => notifs.push({ id: `pending_dealer_${d.id}`, icon: "🏪", message: `${d.dealer_name} 딜러 가입 대기`, time: d.created_date, type: "pending_approval" }));
        pendingMembers.forEach(m => notifs.push({ id: `pending_member_${m.id}`, icon: "📞", message: `${m.name} 콜팀원 가입 대기`, time: m.created_date, type: "pending_approval" }));
        pendingOnline.forEach(m => notifs.push({ id: `pending_online_${m.id}`, icon: "💻", message: `${m.name} 온라인팀 가입 대기`, time: m.created_date, type: "pending_approval" }));

        const todayNew = [
          ...allDealers.filter(d => (d.created_date || "").startsWith(today)),
          ...allMembers.filter(m => (m.created_date || "").startsWith(today)),
        ];
        if (todayNew.length > 0) {
          notifs.push({ id: `new_registrations_${today}`, icon: "🆕", message: `오늘 신규 가입 ${todayNew.length}건`, time: new Date().toISOString(), type: "new_registration" });
        }

        dispatchReqs.forEach(r => notifs.push({ id: `dispatch_pending_${r.id}`, icon: "📤", message: `파견요청 대기: ${r.customer_name} → ${r.target_dealer_name}`, time: r.requested_at, type: "dispatch" }));
      }

      const withReadStatus = notifs.map(n => ({ ...n, isRead: readIds[n.id] || false }));
      setNotifications(withReadStatus.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime()));
    } catch (e) {}
  };

  const handleClickNotif = (id) => {
    const readIds = JSON.parse(localStorage.getItem("sf_notif_read") || "{}");
    readIds[id] = true;
    localStorage.setItem("sf_notif_read", JSON.stringify(readIds));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 hover:bg-white/5 rounded-lg transition-all">
        <Bell className="h-5 w-5 text-gray-400 hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0a0c15] border border-white/[0.06] rounded-xl shadow-lg z-50">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">알림</h3>
            {unreadCount > 0 && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{unreadCount}개 미확인</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-600">알림이 없습니다</div>
            ) : (
              notifications.map(notif => (
                <button key={notif.id} onClick={() => handleClickNotif(notif.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.05] transition-all flex gap-3 items-start ${!notif.isRead ? "bg-white/[0.03]" : ""}`}>
                  <span className="text-lg shrink-0">{notif.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{notif.message}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {notif.time ? new Date(notif.time).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "방금 전"}
                    </p>
                  </div>
                  {!notif.isRead && <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}