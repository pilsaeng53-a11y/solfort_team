import { useState, useEffect } from "react";
const API = 'https://solfort-api-9red.onrender.com';
const h = () => ({'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('sf_token')});

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  
  const fetch_notifs = async () => {
    try {
      const role = localStorage.getItem('sf_role');
      const items = [];
      
      if(['super_admin','dealer_admin','call_admin','online_director'].includes(role)) {
        // 승인 대기 가입자
        const usersRes = await fetch(API+'/api/users?status=pending', {headers:h()});
        const users = await usersRes.json();
        if(Array.isArray(users) && users.length > 0) {
          items.push({id:'pending_users', type:'warning', icon:'👤', 
            title:`승인 대기 ${users.length}명`, time:'지금', link:'/admin/super'});
        }
        
        // 오늘 신규 매출
        const today = new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'});
        const salesRes = await fetch(API+'/api/sales', {headers:h()});
        const sales = await salesRes.json();
        if(Array.isArray(sales)) {
          const todaySales = sales.filter(s => 
            new Date(s.registered_at||s.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}) === today
          );
          if(todaySales.length > 0) {
            items.push({id:'today_sales', type:'success', icon:'💰',
              title:`오늘 매출 ${todaySales.length}건`, time:'오늘', link:'/my-sales-excel'});
          }
        }
      }
      
      setNotifications(items);
      setUnread(items.length);
    } catch(e) {}
  };
  
  useEffect(() => {
    fetch_notifs();
    const t = setInterval(fetch_notifs, 60000); // 1분마다
    return () => clearInterval(t);
  }, []);
  
  return { notifications, unread, refresh: fetch_notifs };
}