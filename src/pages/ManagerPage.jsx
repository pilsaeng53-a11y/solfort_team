import { useState, useEffect } from 'react';
import { Auth } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import SFCard from '@/components/SFCard';
import * as XLSX from 'xlsx';
import { Download, LogOut } from 'lucide-react';

export default function ManagerPage() {
  const assignedDealer = Auth.getAssignedDealer();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customDate, setCustomDate] = useState(false);
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.title = 'SolFort - 매니저';
    base44.entities.SalesRecord.list('-sale_date', 5000)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r =>
    r.dealer_name === assignedDealer &&
    r.sale_date >= startDate &&
    r.sale_date <= endDate
  );

  const stats = {
    count: filtered.length,
    total: filtered.reduce((a, r) => a + (r.sales_amount || 0), 0),
    new: filtered.filter(r => r.customer_status === 'new').length,
    existing: filtered.filter(r => r.customer_status === 'existing').length,
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      const data = filtered.map(r => ({
        '날짜': r.sale_date,
        '고객명': r.customer_name,
        '연락처': r.phone,
        '매출(한화)': r.sales_amount,
        'USDT': r.usdt_amount,
        '기본SOF': r.base_quantity,
        '최종SOF': r.final_quantity,
        '지갑주소': r.wallet_address,
        '구분': r.customer_status,
        '대리점명': r.dealer_name,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '매출내역');
      XLSX.writeFile(wb, `솔포트_${assignedDealer}_${startDate}_${endDate}.xlsx`);
    } catch (e) {
      alert('다운로드 중 오류가 발생했습니다: ' + e.message);
    }
    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080a12] border-b border-white/[0.06] px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-sm font-bold text-amber-400">🔑 SolFort 매니저</h1>
            <p className="text-xs text-gray-500 mt-0.5">담당: <span className="text-white">{assignedDealer}</span></p>
          </div>
          <button
            onClick={Auth.logout}
            className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-all"
          >
            <LogOut className="h-3 w-3" /> 로그아웃
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <SFCard className="border-amber-500/30">
          <h2 className="text-base font-bold text-white mb-6">매출 내역 다운로드</h2>

          {/* Assigned Dealer Badge */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2">담당 대리점</p>
            <div className="inline-block bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold">
              {assignedDealer}
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCustomDate(false)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  !customDate
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                이번달
              </button>
              <button
                onClick={() => setCustomDate(true)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  customDate
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                직접선택
              </button>
            </div>

            {customDate && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 block mb-1">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 block mb-1">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: '총 건수', value: `${stats.count}건`, color: 'text-blue-400' },
              { label: '총 매출', value: `₩${stats.total.toLocaleString()}`, color: 'text-emerald-400' },
              { label: '신규', value: `${stats.new}명`, color: 'text-yellow-400' },
              { label: '기존', value: `${stats.existing}명`, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-[10px] text-gray-500">{s.label}</p>
                <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading || filtered.length === 0}
            className="w-full py-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-bold hover:from-amber-500/30 hover:to-yellow-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {downloading ? '다운로드 중...' : '📥 엑셀 다운로드'}
          </button>

          {filtered.length === 0 && (
            <p className="text-center text-xs text-gray-600 mt-4">
              해당 기간의 매출 내역이 없습니다.
            </p>
          )}
        </SFCard>
      </div>
    </div>
  );
}