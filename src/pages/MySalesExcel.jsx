import { useState, useEffect } from "react";
import { Sales, Leads, Users, Reviews } from "@/api/neonClient";

const API = 'https://solfort-api-9red.onrender.com';

export default function MySalesExcel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    callSales: [],
    callLeads: [],
    dealerSales: [],
    reviews: []
  });
  const [fetched, setFetched] = useState(false);

  const user = JSON.parse(localStorage.getItem('sf_user') || '{}');
  const role = user.role || '';

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 병렬로 모든 데이터 가져오기
      const [allSales, allLeads, allReviews] = await Promise.all([
        Sales.list().catch(() => []),
        Leads.list().catch(() => []),
        Reviews.list().catch(() => [])
      ]);

      const today = new Date().toISOString().split('T')[0];

      // 콜매출: source가 'call' 또는 'telegram_call'
      const callSales = (allSales || []).filter(s => 
        (s.source === 'call' || s.source === 'telegram_call') &&
        s.sale_date === today
      );

      // 대리점매출: source가 'dealer' 또는 'telegram_dealer'
      const dealerSales = (allSales || []).filter(s =>
        (s.source === 'dealer' || s.source === 'telegram_dealer') &&
        s.sale_date === today
      );

      // 콜리드: 오늘 것만
      const callLeads = (allLeads || []).filter(l =>
        l.created_at && l.created_at.startsWith(today)
      );

      // 만족도: 오늘 것만
      const reviews = (allReviews || []).filter(r =>
        r.created_at && r.created_at.startsWith(today)
      );

      setData({ callSales, callLeads, dealerSales, reviews });
      setFetched(true);
    } catch(e) {
      alert('데이터 로드 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!fetched) {
      await fetchAllData();
      return;
    }

    setLoading(true);
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      const wb = XLSX.utils.book_new();
      const today = new Date().toLocaleDateString('ko-KR', {timeZone:'Asia/Seoul'})
        .replace(/. /g,'-').replace('.','');

      // 색상 정의
      const COLORS = {
        // 탭 색상
        TAB_EMERALD: '10b981',
        TAB_BLUE: '3b82f6',
        TAB_AMBER: 'f59e0b',
        TAB_PURPLE: 'a855f7',
        
        // 헤더
        HEADER_BG: '0ea5e9',
        HEADER_FONT: 'FFFFFF',
        
        // 상태 색상
        STATUS_NEW: 'FFFF00',      // 🟡 신규
        STATUS_DONE: '92D050',     // 🟢 처리완료
        STATUS_DUPLICATE: 'FF6B6B', // 🔴 추가매출
        
        // 콜리드 추가 색상
        LEAD_ACCEPT: 'd1fae5',  // 수락
        LEAD_REJECT: 'fee2e2',  // 거절
        LEAD_MAYBE: 'dbeafe'    // 가망
      };

      // 헬퍼: 셀 스타일 적용
      const styleCell = (ws, addr, bgRgb, fontRgb, bold = false) => {
        if (!ws[addr]) ws[addr] = {t:'s', v:''};
        ws[addr].s = {
          fill: {patternType:'solid', fgColor:{rgb:bgRgb}},
          font: {color:{rgb:fontRgb}, bold: !!bold}
        };
      };

      // 상태별 배경색
      const getStatusColor = (status) => {
        if (status === 'new') return COLORS.STATUS_NEW;
        if (status === 'duplicate') return COLORS.STATUS_DUPLICATE;
        return COLORS.STATUS_DONE;
      };

      // ========================================
      // 1️⃣ 콜매출 시트 (Emerald 탭)
      // ========================================
      const callSalesHeaders = ['고객명', '연락처', '매출금액', '지갑주소', '콜담당자', '직원코드', '상태', '등록일시'];
      const callSalesRows = data.callSales.map(s => [
        s.customer_name || '-',
        s.phone || '-',
        s.amount || 0,
        s.wallet_address || '-',
        s.caller_name || '-',
        s.from_call_team || '-',
        s.customer_status === 'new' ? '신규' : 
        s.customer_status === 'duplicate' ? '추가매출' : '처리완료',
        new Date(s.registered_at || s.created_at || Date.now())
          .toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet([callSalesHeaders, ...callSalesRows]);
      
      // 헤더 스타일
      callSalesHeaders.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({r:0, c:ci});
        styleCell(ws1, addr, COLORS.HEADER_BG, COLORS.HEADER_FONT, true);
      });

      // 데이터 행 스타일
      data.callSales.forEach((s, ri) => {
        const bgColor = getStatusColor(s.customer_status);
        callSalesHeaders.forEach((_, ci) => {
          const addr = XLSX.utils.encode_cell({r:ri+1, c:ci});
          styleCell(ws1, addr, bgColor, '000000');
        });
      });

      ws1['!tabColor'] = {rgb: COLORS.TAB_EMERALD};
      XLSX.utils.book_append_sheet(wb, ws1, '콜매출');

      // ========================================
      // 2️⃣ 콜리드 시트 (Blue 탭)
      // ========================================
      const callLeadsHeaders = ['고객명', '연락처', '관심금액', '상태', '콜담당자', '비고', '등록일시'];
      const callLeadsRows = data.callLeads.map(l => [
        l.customer_name || '-',
        l.phone || '-',
        l.interested_amount || 0,
        l.status || '대기',
        l.assigned_to || '-',
        l.memo || '-',
        new Date(l.created_at || Date.now())
          .toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet([callLeadsHeaders, ...callLeadsRows]);

      // 헤더 스타일
      callLeadsHeaders.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({r:0, c:ci});
        styleCell(ws2, addr, COLORS.HEADER_BG, COLORS.HEADER_FONT, true);
      });

      // 데이터 행 스타일 (비고 키워드별 색상)
      data.callLeads.forEach((l, ri) => {
        const memo = (l.memo || '').toLowerCase();
        let bgColor = COLORS.STATUS_DONE; // 기본
        
        if (memo.includes('수락')) bgColor = COLORS.LEAD_ACCEPT;
        else if (memo.includes('거절')) bgColor = COLORS.LEAD_REJECT;
        else if (memo.includes('가망')) bgColor = COLORS.LEAD_MAYBE;
        else if (l.customer_status === 'new') bgColor = COLORS.STATUS_NEW;

        callLeadsHeaders.forEach((_, ci) => {
          const addr = XLSX.utils.encode_cell({r:ri+1, c:ci});
          styleCell(ws2, addr, bgColor, '000000');
        });
      });

      ws2['!tabColor'] = {rgb: COLORS.TAB_BLUE};
      XLSX.utils.book_append_sheet(wb, ws2, '콜리드');

      // ========================================
      // 3️⃣ 대리점 시트 (Amber 탭)
      // ========================================
      const dealerSalesHeaders = ['고객명', '연락처', '매출금액', '지갑주소', '딜러명', '상태', '등록일시'];
      const dealerSalesRows = data.dealerSales.map(s => [
        s.customer_name || '-',
        s.phone || '-',
        s.amount || 0,
        s.wallet_address || '-',
        s.dealer_name || '-',
        s.customer_status === 'new' ? '신규' :
        s.customer_status === 'duplicate' ? '추가매출' : '처리완료',
        new Date(s.registered_at || s.created_at || Date.now())
          .toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})
      ]);

      const ws3 = XLSX.utils.aoa_to_sheet([dealerSalesHeaders, ...dealerSalesRows]);

      // 헤더 스타일
      dealerSalesHeaders.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({r:0, c:ci});
        styleCell(ws3, addr, COLORS.HEADER_BG, COLORS.HEADER_FONT, true);
      });

      // 데이터 행 스타일
      data.dealerSales.forEach((s, ri) => {
        const bgColor = getStatusColor(s.customer_status);
        dealerSalesHeaders.forEach((_, ci) => {
          const addr = XLSX.utils.encode_cell({r:ri+1, c:ci});
          styleCell(ws3, addr, bgColor, '000000');
        });
      });

      ws3['!tabColor'] = {rgb: COLORS.TAB_AMBER};
      XLSX.utils.book_append_sheet(wb, ws3, '대리점');

      // ========================================
      // 4️⃣ 만족도 시트 (Purple 탭)
      // ========================================
      const reviewsHeaders = ['고객명', '연락처', '평점', '후기내용', '담당자', '등록일시'];
      const reviewsRows = data.reviews.map(r => [
        r.customer_name || '-',
        r.phone || '-',
        r.rating || 0,
        r.review_text || '-',
        r.assigned_to || '-',
        new Date(r.created_at || Date.now())
          .toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})
      ]);

      const ws4 = XLSX.utils.aoa_to_sheet([reviewsHeaders, ...reviewsRows]);

      // 헤더 스타일
      reviewsHeaders.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({r:0, c:ci});
        styleCell(ws4, addr, COLORS.HEADER_BG, COLORS.HEADER_FONT, true);
      });

      // 데이터 행 스타일 (평점별)
      data.reviews.forEach((r, ri) => {
        const rating = r.rating || 0;
        let bgColor = 'f3f4f6'; // 회색 기본
        
        if (rating === 5) bgColor = 'e9d5ff';      // 연한 보라
        else if (rating === 4) bgColor = 'dbeafe'; // 하늘
        
        reviewsHeaders.forEach((_, ci) => {
          const addr = XLSX.utils.encode_cell({r:ri+1, c:ci});
          styleCell(ws4, addr, bgColor, '000000');
        });
      });

      ws4['!tabColor'] = {rgb: COLORS.TAB_PURPLE};
      XLSX.utils.book_append_sheet(wb, ws4, '만족도');

      // ========================================
      // 다운로드
      // ========================================
      const filename = `SolFort_${today}.xlsx`;
      XLSX.writeFile(wb, filename);

      alert(`엑셀 다운로드 완료!\n파일명: ${filename}\n\n4개 시트:\n🟢 콜매출\n🔵 콜리드\n🟡 대리점\n🟣 만족도`);
    } catch(e) {
      alert('엑셀 생성 실패: ' + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      <div className="sticky top-0 z-20 bg-[#080a12]/95 border-b border-white/[0.06] px-4 py-3">
        <h1 className="text-base font-bold text-white">📊 엑셀 다운로드</h1>
        <p className="text-[10px] text-gray-500">오늘 데이터 4개 시트</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* 데이터 로드 버튼 */}
        {!fetched && (
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-60"
          >
            {loading ? '데이터 로딩 중...' : '📥 데이터 불러오기'}
          </button>
        )}

        {/* 데이터 요약 */}
        {fetched && (
          <div className="bg-[#0d0f1a] border border-white/[0.06] rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">오늘 데이터 요약</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-[10px] text-emerald-400">🟢 콜매출</p>
                <p className="text-xl font-bold text-white mt-1">{data.callSales.length}건</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-[10px] text-blue-400">🔵 콜리드</p>
                <p className="text-xl font-bold text-white mt-1">{data.callLeads.length}건</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-[10px] text-amber-400">🟡 대리점</p>
                <p className="text-xl font-bold text-white mt-1">{data.dealerSales.length}건</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                <p className="text-[10px] text-purple-400">🟣 만족도</p>
                <p className="text-xl font-bold text-white mt-1">{data.reviews.length}건</p>
              </div>
            </div>
          </div>
        )}

        {/* 엑셀 다운로드 버튼 */}
        {fetched && (
          <button
            onClick={downloadExcel}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-60"
          >
            {loading ? '생성 중...' : '📥 엑셀 다운로드 (4개 시트)'}
          </button>
        )}

        {/* 시트 설명 */}
        {fetched && (
          <div className="bg-[#0d0f1a] border border-white/[0.06] rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">시트 구성</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>🟢 <span className="text-emerald-400 font-semibold">콜매출</span> - 콜팀 매출 (신규🟡/처리완료🟢/추가매출🔴)</p>
              <p>🔵 <span className="text-blue-400 font-semibold">콜리드</span> - 콜팀 리드 (수락/거절/가망 색상)</p>
              <p>🟡 <span className="text-amber-400 font-semibold">대리점</span> - 대리점 매출 (신규🟡/처리완료🟢/추가매출🔴)</p>
              <p>🟣 <span className="text-purple-400 font-semibold">만족도</span> - 고객 후기 (평점별 색상)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
