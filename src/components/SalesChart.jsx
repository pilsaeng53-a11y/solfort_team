import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function SalesChart({ records, dealerName }) {
  const chartData = useMemo(() => {
    if (!records || records.length === 0) return [];
    
    // 최근 14일 데이터
    const days = 14;
    const today = new Date();
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 해당 날짜 매출 합계
      const dayRecords = records.filter(r => 
        r.sale_date === dateStr && 
        (!dealerName || r.dealer_name === dealerName)
      );
      
      const total = dayRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
      const count = dayRecords.length;
      
      data.push({
        date: dateStr,
        dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
        amount: total,
        count: count
      });
    }
    
    return data;
  }, [records, dealerName]);
  
  // 차트 색상
  const maxAmount = Math.max(...chartData.map(d => d.amount), 0);
  
  return (
    <div className="bg-[#0d0f1a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">📈 매출 추이 (최근 14일)</h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-emerald-500" />
            <span className="text-gray-400">매출액</span>
          </div>
        </div>
      </div>
      
      {maxAmount === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          최근 14일 매출 데이터가 없습니다
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#ffffff20' }}
            />
            <YAxis 
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#ffffff20' }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value;
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1a1d2e', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
              formatter={(value, name) => {
                if (name === 'amount') {
                  return [`₩${value.toLocaleString()}`, '매출액'];
                }
                return [value, name];
              }}
            />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              activeDot={{ r: 5, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {maxAmount > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <p className="text-gray-500 mb-0.5">평균</p>
            <p className="text-white font-semibold">
              ₩{Math.round(chartData.reduce((sum, d) => sum + d.amount, 0) / chartData.length).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 mb-0.5">최고</p>
            <p className="text-emerald-400 font-semibold">
              ₩{maxAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 mb-0.5">총 건수</p>
            <p className="text-sky-400 font-semibold">
              {chartData.reduce((sum, d) => sum + d.count, 0)}건
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
