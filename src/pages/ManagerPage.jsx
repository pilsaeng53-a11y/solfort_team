import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Auth } from '@/lib/auth';
import AdminHeader from '../components/AdminHeader';
import SFCard from '../components/SFCard';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

export default function ManagerPage() {
  useEffect(() => { document.title = "SolFort - 매니저"; }, []);

  const assignedDealer = Auth.getAssignedDealer();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    base44.entities.SalesRecord.list('-sale_date', 5000)
      .then(data => {
        setRecords(data.filter(r => r.dealer_name === assignedDealer));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assignedDealer]);

  const filtered = records.filter(r => r.sale_date >= startDate && r.sale_date <= endDate);
  const totalCount = filtered.length;
  const totalSales = filtered.reduce((a, r) => a + (r.sales_amount || 0), 0);
  const newCount = filtered.filter(r => r.customer_status === 'new').length;
  const existingCount = filtered.filter(r => r.customer_status === 'existing').length;

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = filtered.map(r => ({
        '날짜': r.sale_date,
        '고객명': r.customer_name,
        '연락처': r.phone,
        '매출(한화)': r.sales_amount || 0,
        'USDT': r.usdt_amount || 0,
        '최종SOF': r.final_quantity || 0,
        '지갑주소': r.wallet_address || '',
        '구분': r.customer_status === 'new' ? '신규' : r.customer_status === 'existing' ? '기존' : '중복',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '매출내역');
      XLSX.writeFile(wb, `솔포트_${assignedDealer}_${startDate}_${endDate}.xlsx`);
    } catch (e) {
      alert('다운로드 실패: ' + e.message);
    }
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-[#080a12]">
      <AdminHeader title={`매니저 - ${assignedDealer}`} accent="amber" />

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SFCard>
              <h2 className="text-sm font-bold text-amber-400 mb-4">📊 담당 대리점 매출 내역 다운로드</h2>

              {/* Date Range */}
              <div className="flex gap-2 mb-4 items-end">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <span className="text-gray-600 text-xs pb-2">~</span>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">총 건수</p>
                  <p className="text-lg font-bold text-white mt-1">{totalCount}건</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">총 매출</p>
                  <p className="text-lg font-bold text-white mt-1">₩{totalSales.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">신규</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{newCount}건</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500">기존</p>
                  <p className="text-lg font-bold text-blue-400 mt-1">{existingCount}건</p>
                </div>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="w-full bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 rounded-xl h-12 font-semibold text-sm disabled:opacity-50"
              >
                {exporting ? '다운로드 중...' : '📥 엑셀 다운로드'}
              </Button>
            </SFCard>

            {/* Preview Table */}
            {filtered.length > 0 && (
              <SFCard>
                <h3 className="text-xs font-semibold text-gray-400 mb-3">미리보기 (최근 10건)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/[0.06]">
                        <th className="text-left py-2 px-2">날짜</th>
                        <th className="text-left py-2 px-2">고객명</th>
                        <th className="text-left py-2 px-2">연락처</th>
                        <th className="text-right py-2 px-2">매출</th>
                        <th className="text-right py-2 px-2">SOF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 10).map(r => (
                        <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="py-2 px-2 text-gray-500">{r.sale_date}</td>
                          <td className="py-2 px-2 text-white">{r.customer_name}</td>
                          <td className="py-2 px-2 text-gray-400">{r.phone}</td>
                          <td className="py-2 px-2 text-right text-white">₩{(r.sales_amount || 0).toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-blue-400">{(r.final_quantity || 0).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SFCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}