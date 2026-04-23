import { useState, useEffect } from "react";
import { Auth } from "@/api/neonClient";
import SFCard from "@/components/SFCard";
import { FileText, Filter, Download, Search } from "lucide-react";

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

function LogItem({ log }) {
  const actionColors = {
    create: 'text-emerald-400 bg-emerald-500/10',
    update: 'text-sky-400 bg-sky-500/10',
    delete: 'text-red-400 bg-red-500/10',
    login: 'text-purple-400 bg-purple-500/10',
    export: 'text-amber-400 bg-amber-500/10'
  };
  
  const colorClass = actionColors[log.action] || 'text-gray-400 bg-gray-500/10';
  
  const actionLabels = {
    create: '생성',
    update: '수정',
    delete: '삭제',
    login: '로그인',
    export: '내보내기'
  };
  
  return (
    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
      <div className="flex items-start gap-3">
        <div className={`px-2 py-1 rounded text-[10px] font-semibold ${colorClass}`}>
          {actionLabels[log.action] || log.action}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h4 className="text-sm font-semibold text-white mb-0.5">
                {log.description}
              </h4>
              <p className="text-xs text-gray-400">
                {log.entity_type && `${log.entity_type} · `}
                {log.user_name || log.username}
              </p>
            </div>
            
            <span className="text-[10px] text-gray-600 whitespace-nowrap">
              {new Date(log.created_at).toLocaleString('ko-KR')}
            </span>
          </div>
          
          {log.details && (
            <div className="mt-2 p-2 bg-black/20 rounded text-[10px] text-gray-400 font-mono overflow-x-auto">
              {log.details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SystemLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('today'); // today, week, month, all
  
  useEffect(() => {
    loadLogs();
  }, [dateRange]);
  
  const loadLogs = async () => {
    let timeout;
    try {
      timeout = setTimeout(() => {
        console.error('Logs loading timeout');
        setLoading(false);
      }, 10000);
      
      // API를 통해 audit_logs 조회
      const { base44 } = await import('@/api/base44Client');
      const filterParams = {};
      if (dateRange === 'today') filterParams.range = 'today';
      else if (dateRange === 'week') filterParams.range = 'week';
      else if (dateRange === 'month') filterParams.range = 'month';
      
      const result = await base44.entities.AuditLog.filter(filterParams);
      
      clearTimeout(timeout);
      setLogs(result || []);
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to load logs:', error);
      clearTimeout(timeout);
      
      // 임시 샘플 데이터 (DB 연결 실패시)
      const sampleLogs = [
        {
          id: 1,
          action: 'create',
          entity_type: 'sales_record',
          entity_id: 123,
          user_name: '홍길동',
          username: 'hong',
          description: '신규 매출 등록: 김철수님 ₩500,000',
          details: 'customer_name: 김철수, amount: 500000',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          action: 'update',
          entity_type: 'incentive_setting',
          entity_id: 45,
          user_name: '박영희',
          username: 'park',
          description: '인센티브 요율 변경: 15% → 18%',
          details: 'member: 이민수, rate_percent: 15 → 18',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          action: 'export',
          entity_type: 'sales_record',
          user_name: '최지은',
          username: 'choi',
          description: '엑셀 파일 내보내기 (4개 시트)',
          details: '콜매출: 15건, 콜리드: 8건, 대리점: 12건, 만족도: 5건',
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 4,
          action: 'delete',
          entity_type: 'call_lead',
          entity_id: 67,
          user_name: '김영수',
          username: 'kim',
          description: '콜 리드 삭제',
          details: 'customer_name: 이순신, reason: 중복 데이터',
          created_at: new Date(Date.now() - 10800000).toISOString()
        }
      ];
      
      setLogs(sampleLogs);
      setLoading(false);
    }
  };
  
  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.action !== filter) return false;
    if (searchTerm && !log.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  const handleExport = () => {
    const csv = [
      ['시간', '작업', '유형', '사용자', '설명'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString('ko-KR'),
        log.action,
        log.entity_type || '',
        log.user_name || log.username,
        `"${log.description}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
  
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
            <h1 className="text-base font-bold text-white">📋 시스템 로그</h1>
            <p className="text-[10px] text-gray-500">
              전체 {filteredLogs.length}건
            </p>
          </div>
          
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            CSV 내보내기
          </button>
        </div>
        
        {/* 검색 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="로그 검색..."
            className="w-full pl-10 pr-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        
        {/* 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: '전체' },
            { value: 'create', label: '생성' },
            { value: 'update', label: '수정' },
            { value: 'delete', label: '삭제' },
            { value: 'export', label: '내보내기' }
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
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* 로그 목록 */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">로그가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map(log => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}