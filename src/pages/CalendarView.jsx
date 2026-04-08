import { useState, useEffect } from 'react';
import { Auth } from '@/api/neonClient';
import { base44 } from '@/api/neonClient';
import SFCard from '@/components/SFCard';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarView() {
  const role = Auth.getRole();
  const dealerName = Auth.getDealerName();
  const [now, setNow] = useState(new Date());
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayRecords, setDayRecords] = useState([]);

  useEffect(() => {
    document.title = 'SolFort - 캘린더';
    load();
  }, [year, month]);

  const load = async () => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      let data = {};

      if (['dealer', 'dealer_admin'].includes(role)) {
        const sales = await base44.entities.SalesRecord.list('-sale_date', 5000);
        const filtered = sales.filter(s => 
          s.sale_date?.startsWith(monthStr) && 
          (role === 'super_admin' || role === 'dealer_admin' || s.dealer_name === dealerName)
        );
        filtered.forEach(r => {
          const d = r.sale_date;
          if (!data[d]) data[d] = { amount: 0, count: 0, new: 0, existing: 0, records: [], type: 'sales' };
          data[d].amount += r.sales_amount || 0;
          data[d].count++;
          if (r.customer_status === 'new') data[d].new++;
          if (r.customer_status === 'existing') data[d].existing++;
          data[d].records.push(r);
        });
      } else if (role === 'call_team') {
        const logs = await base44.entities.CallLog.list('-called_at', 5000);
        const filtered = logs.filter(l =>
          l.called_at?.startsWith(monthStr) && l.called_by === dealerName
        );
        filtered.forEach(l => {
          const d = l.called_at?.substring(0, 10);
          if (!data[d]) data[d] = { calls: 0, success: 0, records: [], type: 'calls' };
          data[d].calls++;
          if (l.call_result === '관심있음' || l.call_result === '매출전환') data[d].success++;
          data[d].records.push(l);
        });
      } else if (['call_admin', 'super_admin'].includes(role)) {
        const [sales, logs] = await Promise.all([
          base44.entities.SalesRecord.list('-sale_date', 5000),
          base44.entities.CallLog.list('-called_at', 5000)
        ]);
        const filteredSales = sales.filter(s => s.sale_date?.startsWith(monthStr));
        const filteredLogs = logs.filter(l => l.called_at?.startsWith(monthStr));
        
        filteredSales.forEach(r => {
          const d = r.sale_date;
          if (!data[d]) data[d] = { amount: 0, count: 0, records: [], type: 'sales' };
          data[d].amount += r.sales_amount || 0;
          data[d].count++;
          data[d].records.push(r);
        });
        filteredLogs.forEach(l => {
          const d = l.called_at?.substring(0, 10);
          if (!data[d]) data[d] = { calls: 0, records: [], type: 'calls' };
          data[d].calls++;
          data[d].records.push(l);
        });
      }

      setByDate(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthTotal = Object.values(byDate).reduce((a, d) => a + (d.amount || 0), 0);
  const monthCount = Object.values(byDate).reduce((a, d) => a + (d.count || d.calls || 0), 0);
  const activeDays = Object.keys(byDate).length;

  const onDateClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDay(dateStr);
    setDayRecords((byDate[dateStr] || {}).records || []);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && year === today.getFullYear() && month === today.getMonth();
  };

  const prev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const next = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#080a12] p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={prev} className="p-2 hover:bg-white/5 rounded-lg transition-all"><ChevronLeft className="w-5 h-5 text-white" /></button>
          <h1 className="text-lg font-bold text-white">{year}년 {month + 1}월</h1>
          <div className="flex gap-2">
            <button onClick={goToday} className="px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-all">오늘</button>
            <button onClick={next} className="p-2 hover:bg-white/5 rounded-lg transition-all"><ChevronRight className="w-5 h-5 text-white" /></button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#0d0f1a] rounded-2xl p-4 border border-white/[0.06]">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>)}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const data = byDate[dateStr];
              const isCurrentMonth = true;
              const today = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => onDateClick(day)}
                  className={`min-h-[80px] rounded-lg p-2 text-left transition-all ${
                    today ? 'ring-2 ring-blue-500' : ''
                  } ${data ? 'bg-[#0d1a12] hover:bg-[#0f2415]' : 'bg-white/[0.02] hover:bg-white/[0.05]'}`}
                >
                  <p className={`text-sm font-semibold ${isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>{day}</p>
                  {data && (
                    <div className="mt-1 space-y-0.5">
                      {data.type === 'sales' && (
                        <>
                          <p className="text-xs text-emerald-400 font-semibold">₩{(data.amount / 1000000).toFixed(1)}M</p>
                          <p className="text-xs text-gray-400">{data.count}건</p>
                        </>
                      )}
                      {data.type === 'calls' && (
                        <p className="text-xs text-blue-400">{data.calls}콜 {data.success > 0 ? `🔴${data.success}` : ''}</p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Month Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['call_team'].includes(role) ? (
            <>
              <SFCard><p className="text-[10px] text-gray-500">총 콜 수</p><p className="text-lg font-bold text-blue-400 mt-1">{monthCount}건</p></SFCard>
              <SFCard><p className="text-[10px] text-gray-500">활동일수</p><p className="text-lg font-bold text-yellow-400 mt-1">{activeDays}일</p></SFCard>
            </>
          ) : (
            <>
              <SFCard><p className="text-[10px] text-gray-500">총 매출</p><p className="text-lg font-bold text-emerald-400 mt-1">₩{(monthTotal / 1000000).toFixed(1)}M</p></SFCard>
              <SFCard><p className="text-[10px] text-gray-500">총 건수</p><p className="text-lg font-bold text-blue-400 mt-1">{monthCount}건</p></SFCard>
              <SFCard><p className="text-[10px] text-gray-500">활동일수</p><p className="text-lg font-bold text-yellow-400 mt-1">{activeDays}일</p></SFCard>
              <SFCard><p className="text-[10px] text-gray-500">일평균</p><p className="text-lg font-bold text-purple-400 mt-1">₩{(monthTotal / (activeDays || 1) / 1000000).toFixed(2)}M</p></SFCard>
            </>
          )}
        </div>
      </div>

      {/* Day Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
          <div className="w-full bg-[#0d0f1a] rounded-t-2xl border-t border-white/[0.06] max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] sticky top-0 bg-[#0d0f1a]">
              <h3 className="text-sm font-bold text-white">{selectedDay}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-2">
              {dayRecords.length === 0 ? (
                <p className="text-xs text-gray-600">기록이 없습니다</p>
              ) : (
                dayRecords.map((r, i) => (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-2.5 text-xs">
                    {r.customer_name && <p className="text-white font-medium">{r.customer_name}</p>}
                    {r.lead_name && <p className="text-white font-medium">{r.lead_name}</p>}
                    {r.sales_amount && <p className="text-emerald-400">₩{r.sales_amount.toLocaleString()}</p>}
                    {r.call_result && <p className="text-blue-400">{r.call_result}</p>}
                    {r.dealer_name && <p className="text-gray-500">대리점: {r.dealer_name}</p>}
                    {r.called_by && <p className="text-gray-500">담당자: {r.called_by}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}