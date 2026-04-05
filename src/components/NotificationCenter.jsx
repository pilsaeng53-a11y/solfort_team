import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        await loadNotifications(currentUser);
      } catch (e) {
        console.error("Failed to load user", e);
      }
      setLoading(false);
    };
    init();

    const timer = setInterval(() => {
      if (user) loadNotifications(user);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const loadNotifications = async (currentUser) => {
    try {
      const readIds = JSON.parse(localStorage.getItem("sf_notif_read") || "{}");
      const notifs = [];

      if (!currentUser) return;

      // Dealer / Call Team
      if (currentUser.role === "dealer" || currentUser.role === "call_team") {
        if (currentUser.role === "dealer") {
          const dealers = await base44.entities.DealerInfo.filter({
            username: currentUser.username,
          });
          if (dealers.length > 0) {
            const dealer = dealers[0];
            if (dealer.status === "active") {
              notifs.push({
                id: `dealer_approved_${dealer.id}`,
                icon: "✅",
                message: `계정이 승인되었습니다.`,
                time: dealer.updated_date || dealer.created_date,
                type: "approval",
              });
            } else if (dealer.status === "pending") {
              notifs.push({
                id: `dealer_pending_${dealer.id}`,
                icon: "⏳",
                message: `계정 승인 대기 중입니다.`,
                time: dealer.created_date,
                type: "pending",
              });
            }
          }
        } else if (currentUser.role === "call_team") {
          const members = await base44.entities.CallTeamMember.filter({
            username: currentUser.username,
          });
          if (members.length > 0) {
            const member = members[0];
            if (member.status === "active") {
              notifs.push({
                id: `member_approved_${member.id}`,
                icon: "✅",
                message: `계정이 승인되었습니다.`,
                time: member.updated_date || member.created_date,
                type: "approval",
              });
            } else if (member.status === "pending") {
              notifs.push({
                id: `member_pending_${member.id}`,
                icon: "⏳",
                message: `계정 승인 대기 중입니다.`,
                time: member.created_date,
                type: "pending",
              });
            }
          }
        }
      }

      // Dealer Admin / Call Admin
      if (currentUser.role === "dealer_admin") {
        const pendingDealers = await base44.entities.DealerInfo.filter({
          status: "pending",
        });
        pendingDealers.forEach((d) => {
          notifs.push({
            id: `pending_dealer_${d.id}`,
            icon: "👤",
            message: `${d.dealer_name} 딜러 승인 대기`,
            time: d.created_date,
            type: "pending_approval",
          });
        });
      }

      if (currentUser.role === "call_admin") {
        const pendingMembers = await base44.entities.CallTeamMember.filter({
          status: "pending",
        });
        pendingMembers.forEach((m) => {
          notifs.push({
            id: `pending_member_${m.id}`,
            icon: "👤",
            message: `${m.name} 콜팀원 승인 대기`,
            time: m.created_date,
            type: "pending_approval",
          });
        });
      }

      // Super Admin
      if (currentUser.role === "super_admin") {
        const pendingDealers = await base44.entities.DealerInfo.filter({
          status: "pending",
        });
        pendingDealers.forEach((d) => {
          notifs.push({
            id: `pending_dealer_${d.id}`,
            icon: "👤",
            message: `${d.dealer_name} 딜러 가입 대기`,
            time: d.created_date,
            type: "pending_approval",
          });
        });

        const pendingMembers = await base44.entities.CallTeamMember.filter({
          status: "pending",
        });
        pendingMembers.forEach((m) => {
          notifs.push({
            id: `pending_member_${m.id}`,
            icon: "👤",
            message: `${m.name} 콜팀원 가입 대기`,
            time: m.created_date,
            type: "pending_approval",
          });
        });

        const today = new Date().toISOString().split("T")[0];
        const todayRecords = await base44.entities.SalesRecord.filter({
          sale_date: today,
        });
        if (todayRecords.length > 0) {
          const total = todayRecords.reduce(
            (sum, r) => sum + (r.sales_amount || 0),
            0
          );
          notifs.push({
            id: "sales_alert_today",
            icon: "📈",
            message: `오늘 매출: ₩${total.toLocaleString()}`,
            time: new Date().toISOString(),
            type: "sales_alert",
          });
        }
      }

      // Mark as read/unread
      const withReadStatus = notifs.map((n) => ({
        ...n,
        isRead: readIds[n.id] || false,
      }));

      setNotifications(
        withReadStatus.sort(
          (a, b) =>
            new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime()
        )
      );
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  const handleClickNotif = (id) => {
    const readIds = JSON.parse(localStorage.getItem("sf_notif_read") || "{}");
    readIds[id] = true;
    localStorage.setItem("sf_notif_read", JSON.stringify(readIds));
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/5 rounded-lg transition-all"
      >
        <Bell className="h-5 w-5 text-gray-400 hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0a0c15] border border-white/[0.06] rounded-xl shadow-lg z-50">
          <div className="p-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">알림</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-600">
                알림이 없습니다
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotif(notif.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.05] transition-all flex gap-3 items-start ${
                    !notif.isRead ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <span className="text-lg shrink-0">{notif.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {notif.time
                        ? new Date(notif.time).toLocaleString("ko-KR", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "방금 전"}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}