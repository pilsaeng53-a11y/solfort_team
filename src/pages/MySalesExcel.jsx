import { useState, useEffect } from "react";
const API = 'https://solfort-api-9red.onrender.com';
const h = () => ({'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('sf_token')});

export default function MySalesExcel() {
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState([]);
  const [fetched, setFetched] = useState(false);
  const user = JSON.parse(localStorage.getItem('sf_user') || '{}');
  const role = user.role || '';

  const getRoleLabel = () => {
    if (role === 'dealer') return '내 매출';
    if (role === 'dealer_admin') return '대리점 전체 매출';
    if (role === 'call_team') return '내 콜팀 매출';
    if (role === 'call_admin') return '콜팀 전체 매출';
    if (role === 'online_team') return '내 온라인 매출';
    if (['super_admin','online_director'].includes(role)) return '전체 매출';
    return '매출';
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = API + '/api/sales';
      // 역할에 따라 필터
      if (role === 'dealer') url += '?dealer_id=' + user.id;
      else if (role === 'call_team') url += '?caller_id=' + user.id;
      else if (role === 'online_team') url += '?registered_by_online=' + user.username;
      // admin/super는 전체 조회
      const res = await fetch(url, {headers: h()});
      const data = await res.json();
      // 승인된 매출만 (status가 active이거나 approved이거나 null이 아닌 것)
      const filtered = Array.isArray(data) ? data.filter(s => 
        !s.status || s.status === 'active' || s.status === 'approved' || s.status === '승인'
      ) : [];
      setSales(filtered);
      setFetched(true);
    } catch(e) { alert('데이터 로드 실패: ' + e.message); }
    finally { setLoading(false); }
  };

  const downloadExcel = async () => {
    if (!fetched) { await fetchSales(); return; }
    setLoading(true);
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      const wb = XLSX.utils.book_new();
      const today = new Date().toLocaleDateString('ko-KR', {timeZone:'Asia/Seoul'}).replace(/. /g,'-').replace('.','');

      const styleCell = (ws, addr, bgRgb, fontRgb, bold) => {
        if (!ws[addr]) ws[addr] = {t:'s',v:''};
        ws[addr].s = {fill:{patternType:'solid',fgColor:{rgb:bgRgb}},font:{color:{rgb:fontRgb},bold:!!bold}};
      };

      const headers = ['고객이름','연락처','매출금액','지갑주소','딜러/담당자','직원코드','유형','등록일시'];
      const rows = sales.map(s => [
        s.customer_name || '-',
        s.phone || '-',
        s.amount || 0,
        s.wallet_address || '-',
        s.dealer_name || s.caller_name || '-',
        s.from_call_team || '-',
        s.source === 'telegram_call' ? '콜팀' : s.source === 'telegram_dealer' ? '대리점' : s.source || '직접',
        new Date(s.registered_at||s.created_at||Date.now()).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      headers.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({r:0,c:ci});
        styleCell(ws, addr, '0ea5e9', 'FFFFFF', true);
      });
      rows.forEach((row, ri) => {
        const bg = ri % 2 === 0 ? 'f0f9ff' : 'e0f2fe';
        row.forEach((_, ci) => {
          styleCell(ws, XLSX.utils.encode_cell({r:ri+1,c:ci}), bg, '000000', false);
        });
      });

      XLSX.utils.book_append_sheet(wb, ws, '매출내역');
      XLSX.writeFile(wb, `SolFort_매출_${today}.xlsx`);
    } catch(e) { alert('엑셀 생성 실패: ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSales(); }, []);

  return (
    <div className="min-h-screen bg-[#080a12] p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">📊 매출 엑셀 다운로드</h1>
          <p className="text-xs text-gray-500 mt-0.5">{getRoleLabel()} · {user.name || user.username}</p>
        </div>
        <button onClick={()=>window.history.back()} className="text-xs text-gray-500 hover:text-white">← 뒤로</button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">총 건수</p>
            <p className="text-2xl font-bold text-white mt-1">{sales.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">총 매출</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">₩{sales.reduce((a,s)=>a+(s.amount||0),0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">상태</p>
            <p className="text-sm font-bold text-sky-400 mt-1">{fetched ? '조회완료' : '대기'}</p>
          </div>
        </div>
        <button
          onClick={downloadExcel}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl text-sm disabled:opacity-60 transition-all hover:brightness-110"
        >
          {loading ? '⏳ 기다려주세요...' : '📥 엑셀 다운로드'}
        </button>
        <p className="text-xs text-gray-600 text-center mt-2">승인된 매출만 포함됩니다</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-white/[0.06]">
              {['고객명','연락처','금액','지갑주소','담당','날짜'].map(c=>(
                <th key={c} className="text-left py-2 px-2 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-600">{loading ? '로딩 중...' : '매출 없음'}</td></tr>
            ) : sales.slice(0,50).map(s => (
              <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-2 px-2 text-white font-medium">{s.customer_name}</td>
                <td className="py-2 px-2 text-gray-400">{s.phone||'-'}</td>
                <td className="py-2 px-2 text-emerald-400 font-bold">₩{(s.amount||0).toLocaleString()}</td>
                <td className="py-2 px-2 text-gray-500 max-w-[80px] truncate">{s.wallet_address||'-'}</td>
                <td className="py-2 px-2 text-gray-400">{s.dealer_name||s.caller_name||'-'}</td>
                <td className="py-2 px-2 text-gray-500">{new Date(s.registered_at||s.created_at||Date.now()).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length > 50 && <p className="text-center text-xs text-gray-600 py-2">상위 50건 표시 · 전체는 엑셀로 다운</p>}
      </div>
    </div>
  );
}