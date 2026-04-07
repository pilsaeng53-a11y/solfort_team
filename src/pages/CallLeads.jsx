import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CallLead, CallLog, CallTeamMember, IncentiveSetting, getCurrentUser } from "../api/entities";
import { Auth } from "@/lib/auth";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import { Plus, X, ChevronDown, Send, Copy, Check, TrendingUp, Play, Square, ChevronUp } from "lucide-react";

const STATUS_OPTS = ["신규", "연락됨", "관심있음", "거절", "매출전환"];
const COLOR_FILTERS = [
  { key: "전체", label: "전체" },
  { key: "blue", label: "파란 거절" },
  { key: "yellow", label: "노란 가망" },
  { key: "red", label: "빨강 수낙" },
  { key: "none", label: "미태깅" },
];
const COLOR_BORDER = { blue: "border-l-4 border-blue-500", yellow: "border-l-4 border-yellow-500", red: "border-l-4 border-red-500" };
const STATUS_BADGE = {
  신규: "bg-gray-500/20 text-gray-400",
  연락됨: "bg-blue-500/20 text-blue-400",
  관심있음: "bg-emerald-500/20 text-emerald-400",
  거절: "bg-red-500/20 text-red-400",
  매출전환: "bg-purple-500/20 text-purple-400",
};
const SOURCE_LABELS = { sns: "SNS", referral: "추천", cold_call: "콜드콜", event: "이벤트", other: "기타" };
const INTEREST_STYLE = {
  높음: { badge: "bg-red-500/20 text-red-400", icon: "🔥" },
  중간: { badge: "bg-yellow-500/20 text-yellow-400", icon: "⭐" },
  낮음: { badge: "bg-gray-500/20 text-gray-400", icon: "" },
};

const EMPTY = { name: "", phone: "", source: "cold_call", interest_amount: "", interest_level: "중간", memo: "", tags: "" };
const PRESET_TAGS = ["#투자경험", "#고액관심", "#재통화약속", "#VIP", "#신중", "#빠른결정"];

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallLeads() {
  const navigate = useNavigate();
  const me = Auth.getDealerName();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myInfo, setMyInfo] = useState(null);
  const [incentiveRate, setIncentiveRate] = useState(null);
  const [downlineCount, setDownlineCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("전체");
  const [colorFilter, setColorFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [openStatus, setOpenStatus] = useState(null);
  const [tagFilter, setTagFilter] = useState("");
  const [memos, setMemos] = useState({});
  const [memoInput, setMemoInput] = useState({});
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState({});
  const [callLogs, setCallLogs] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [selectedResult, setSelectedResult] = useState("");
  const [showLogsList, setShowLogsList] = useState(null);

  useEffect(() => {
    document.title = "SolFort - 고객 리드";
    load();
    loadMyInfo();
    handleLongOverdueLeads();
    loadCurrentUser();
    loadCallLogs();
  }, []);

  useEffect(() => {
    if (activeTimer === null) return;
    const interval = setInterval(() => {
      setTimerSeconds(p => ({ ...p, [activeTimer]: (p[activeTimer] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const loadCurrentUser = async () => {
    const user = getCurrentUser();
    setCurrentUser(user);
  };

  const loadCallLogs = async () => {
    const logs = await CallLog.list();
    const grouped = {};
    logs.forEach(log => {
      if (!grouped[log.lead_id]) grouped[log.lead_id] = [];
      grouped[log.lead_id].push(log);
    });
    setCallLogs(grouped);
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = Object.values(callLogs).flat().filter(log => log.called_at?.startsWith(today));
    const totalCount = todayLogs.length;
    const totalDuration = todayLogs.reduce((sum, log) => sum + (log.call_duration || 0), 0);
    return { totalCount, totalDuration };
  };

  const startTimer = (leadId) => {
    setActiveTimer(leadId);
    setTimerSeconds(p => ({ ...p, [leadId]: p[leadId] || 0 }));
  };

  const stopTimer = async (leadId) => {
    const seconds = timerSeconds[leadId] || 0;
    const duration = Math.floor(seconds / 60);
    setActiveTimer(null);
    setShowResult(leadId);
    setSelectedResult("");
  };

  const saveCallLog = async (leadId) => {
    const seconds = timerSeconds[leadId] || 0;
    const duration = Math.floor(seconds / 60);
    if (!selectedResult) return;
    const log = await CallLog.create({
      lead_id: leadId,
      lead_name: leads.find(l => l.id === leadId)?.name || '',
      phone: leads.find(l => l.id === leadId)?.phone || '',
      call_result: selectedResult,
      call_duration: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
      memo: '',
      called_by: currentUser?.full_name || me,
      called_at: new Date().toISOString(),
    });
    setCallLogs(p => ({ ...p, [leadId]: [...(p[leadId] || []), log] }));
    setShowResult(null);
    setTimerSeconds(p => ({ ...p, [leadId]: 0 }));
    setSelectedResult("");
    await loadCallLogs();
  };

  const handleLongOverdueLeads = async () => {
    const flagKey = `long_overdue_check_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(flagKey)) return;
    
    const allLeads = await CallLead.list();
    const today = new Date();
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const longOverdue = allLeads.filter(l => l.status === '재콜예정' && l.next_call_date && l.next_call_date < threeDaysAgo);
    
    for (const lead of longOverdue) {
      await CallLead.update(lead.id, { status: '장기미처리', tag: '장기미처리' });
    }
    
    if (longOverdue.length > 0) {
      const leaders = await CallTeamMember.list();
      const teamLeaders = leaders.filter(l => l.position && (l.position.includes('팀장') || l.position.includes('지사장')));
      
      const BOT_TOKEN = '8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8';
      const CHAT_ID = '5757341051';
      
      for (const lead of longOverdue) {
        const daysOverdue = Math.floor((today.getTime() - new Date(lead.next_call_date).getTime()) / (24 * 60 * 60 * 1000));
        const msg = `⚠️ 장기미처리 고객\n[${lead.name}] ${lead.phone}\n담당: ${lead.assigned_to}\n${daysOverdue}일째 미처리`;
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, text: msg }),
        }).catch(() => {});
      }
    }
    
    sessionStorage.setItem(flagKey, 'true');
  };

  const loadMyInfo = async () => {
    const stored = JSON.parse(localStorage.getItem('sf_dealer') || '{}');
    setMyInfo(stored);
    // incentive rate
    if (stored?.id || stored?.username) {
      const settings = await IncentiveSetting.filter({ member_id: stored.id });
      if (settings.length > 0) setIncentiveRate(settings[0].rate_percent);
      const downline = await CallTeamMember.filter({ parent_id: stored.id });
      setDownlineCount(downline.length);
    }
  };

  const copyCode = () => {
    if (!myInfo?.my_referral_code) return;
    navigator.clipboard.writeText(myInfo.my_referral_code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const load = async () => {
    const l = await CallLead.list();
    setLeads(l);
    const m = {};
    setMemos(m);
    setLoading(false);
  };
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    await CallLead.create({
      ...form,
      interest_amount: form.interest_amount ? Number(form.interest_amount) : 0,
      status: "신규", created_by: me, assigned_to: me,
      created_at: new Date().toISOString(),
    });
    setShowModal(false); setForm(EMPTY);
    await load(); setSaving(false);
  };

  const changeStatus = async (id, status) => {
    await CallLead.update(id, { status });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setOpenStatus(null);
  };

  const toggleBookmark = async (id, isBookmarked) => {
    await CallLead.update(id, { is_bookmarked: !isBookmarked });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, is_bookmarked: !isBookmarked } : l));
  };

  const toggleTag = (tag) => {
    const tags = (form.tags || "").split(",").filter(Boolean);
    if (tags.includes(tag)) {
      form.tags = tags.filter(t => t !== tag).join(",");
    } else {
      tags.push(tag);
      form.tags = tags.join(",");
    }
    setForm({ ...form });
  };

  const saveMemo = async (leadId) => {
    const text = memoInput[leadId]?.trim();
    if (!text) return;
    setMemoInput(p => ({ ...p, [leadId]: '' }));
    setMemos(p => ({ ...p, [leadId]: [...(p[leadId] || []), { memo: text, created_by: me, created_at: new Date().toISOString() }] }));
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchS = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q);
    const matchT = tab === "전체" || l.status === tab;
    const matchC = colorFilter === "전체" || (colorFilter === "none" ? !l.color_tag : l.color_tag === colorFilter);
    const matchTag = !tagFilter || (l.tags || "").includes(tagFilter);
    return matchS && matchT && matchC && matchTag;
  });

  const longOverdueLeads = filtered.filter(l => l.status === '장기미처리');
  const { totalCount, totalDuration } = getTodayStats();

  if (loading) return <><CallNav /><Loader /></>;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        {/* 내 정보 미니 카드 */}
        {/* 오늘 통화 통계 */}
        <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-white/10 rounded-2xl p-4 flex items-center gap-6">
          <div>
            <p className="text-[10px] text-gray-500 mb-1">오늘 통화 건수</p>
            <p className="text-2xl font-bold text-blue-400">{totalCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">누적 통화 시간</p>
            <p className="text-2xl font-bold text-emerald-400">{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}</p>
          </div>
        </div>

        {myInfo && (
          <div className="bg-[#0d1020] border border-white/[0.07] rounded-2xl p-3.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {myInfo.position && (
                <span className="px-2.5 py-1 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-semibold">
                  💼 {myInfo.position}
                </span>
              )}
              {myInfo.team && (
                <span className="px-2.5 py-1 bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-semibold">
                  🏢 {myInfo.team}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {myInfo.my_referral_code ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                  <span className="text-emerald-400 font-mono font-bold text-xs tracking-widest">{myInfo.my_referral_code}</span>
                  <button onClick={copyCode} className="text-emerald-400 hover:text-emerald-300 transition-all">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-gray-600">추천코드 없음</span>
              )}
              <span className="text-[10px] text-gray-500">하위 {downlineCount}명</span>
              {incentiveRate !== null && (
                <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg">
                  <TrendingUp className="h-3 w-3" /> {incentiveRate}%
                </span>
              )}
            </div>
            <button onClick={() => navigate('/incentive-settings')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-medium hover:bg-purple-500/20 transition-all shrink-0">
              📊 인센티브 현황
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">고객 리드 <span className="text-sm font-normal text-gray-500">({filtered.length})</span></h1>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 transition-all">
            <Plus className="h-3.5 w-3.5" /> 리드 추가
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {["전체", ...STATUS_OPTS].map(s => (
            <button key={s} onClick={() => setTab(s)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${tab === s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[["전체","전체"],["blue","파란(거절)"],["yellow","노란(가망)"],["red","빨간(수락)"],["미태깅","미태깅"]].map(([v,l]) => (
            <button key={v} onClick={() => setColorFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${colorFilter === v ? "bg-white/20 text-white border border-white/30" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
              {v === "blue" ? "🔵" : v === "yellow" ? "🟡" : v === "red" ? "🔴" : ""} {l}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-gray-500 self-center">태그:</span>
          {["", ...PRESET_TAGS].map(t => (
            <button key={t} onClick={() => setTagFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] transition-all ${tagFilter === t ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
              {t || "전체"}
            </button>
          ))}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 또는 연락처 검색"
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-600" />

        <div className="space-y-2">
          {longOverdueLeads.length > 0 && (
            <div className="bg-orange-500/10 border-l-4 border-orange-500 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-orange-400 mb-2">⚠️ 장기미처리 고객 ({longOverdueLeads.length}명)</p>
              <div className="space-y-1">
                {longOverdueLeads.map(l => {
                  const daysOverdue = Math.floor((new Date().getTime() - new Date(l.next_call_date).getTime()) / (24 * 60 * 60 * 1000));
                  return (
                    <div key={l.id} className="text-xs text-gray-300">
                      {l.name} · {l.phone} · {daysOverdue}일 미처리
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {filtered.length === 0 && <p className="text-center py-12 text-xs text-gray-600">리드가 없습니다</p>}
          {filtered.map(lead => {
           const iStyle = INTEREST_STYLE[lead.interest_level] || INTEREST_STYLE["낙음"];
           const borderCls = COLOR_BORDER[lead.color_tag] || "border-l-4 border-transparent";
           const isLongOverdue = lead.status === '장기미처리';
           const daysOverdue = isLongOverdue ? Math.floor((new Date().getTime() - new Date(lead.next_call_date).getTime()) / (24 * 60 * 60 * 1000)) : 0;
           const longOverdueBorder = isLongOverdue ? 'border-2 border-orange-500' : borderCls;
           return (
              <div key={lead.id} className="space-y-2">
               <SFCard className={longOverdueBorder}>
               <div className="flex items-start gap-3" >
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{lead.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_BADGE[lead.status] || "bg-white/5 text-gray-400"}`}>{lead.status}</span>
                      {lead.source && <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">{SOURCE_LABELS[lead.source] || lead.source}</span>}
                      {lead.interest_level && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${iStyle.badge}`}>{iStyle.icon} {lead.interest_level}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{lead.phone}</p>
                    {lead.tags && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {lead.tags.split(",").filter(Boolean).map(tag => (
                          <span key={tag} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-gray-500">
                      {lead.interest_amount > 0 && <span className="text-emerald-400">₩{Number(lead.interest_amount).toLocaleString()}</span>}
                      {lead.next_call_date && <span className="text-yellow-400">📅 {lead.next_call_date}</span>}
                      {lead.memo && <span className="truncate max-w-[150px]">{lead.memo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleBookmark(lead.id, lead.is_bookmarked)}
                      className={`text-lg transition-all ${lead.is_bookmarked ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}>
                      ⭐
                    </button>
                    <button onClick={() => setShowLogsList(showLogsList === lead.id ? null : lead.id)}
                       className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/20 transition-all whitespace-nowrap">
                        일지 보기
                      </button>
                    <div className="relative">
                      <button onClick={() => setOpenStatus(openStatus === lead.id ? null : lead.id)}
                        className="flex items-center gap-1 text-[10px] bg-white/5 text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-all">
                        상태 변경 <ChevronDown className="h-3 w-3" />
                      </button>
                      {openStatus === lead.id && (
                        <div className="absolute right-0 top-8 z-20 bg-[#10131e] border border-white/10 rounded-xl shadow-xl min-w-[110px]">
                          {STATUS_OPTS.map(s => (
                            <button key={s} onClick={() => changeStatus(lead.id, s)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-all first:rounded-t-xl last:rounded-b-xl ${lead.status === s ? "text-emerald-400" : "text-gray-300"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SFCard>
              
              {/* Call Logs */}
              {showLogsList === lead.id && (
                <SFCard className="bg-purple-500/[0.03]">
                  <p className="text-xs font-semibold text-gray-400 mb-2.5">📞 오늘의 통화 일지</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {(callLogs[lead.id] || []).filter(log => log.called_at?.startsWith(new Date().toISOString().split('T')[0])).length === 0 ? (
                      <p className="text-[10px] text-gray-600 text-center py-2">통화 기록이 없습니다</p>
                    ) : (
                      (callLogs[lead.id] || []).filter(log => log.called_at?.startsWith(new Date().toISOString().split('T')[0])).map((log, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] bg-white/5 rounded-lg p-2 border border-white/5">
                          <span className="text-gray-500 min-w-fit">{log.called_at?.substring(11, 16)}</span>
                          <span className="text-gray-400 min-w-fit">{log.call_duration || '0:00'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                            log.call_result === '수락' ? 'bg-emerald-500/20 text-emerald-400' :
                            log.call_result === '거절' ? 'bg-red-500/20 text-red-400' :
                            log.call_result === '가망' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>{log.call_result}</span>
                        </div>
                      ))
                    )}
                  </div>
                </SFCard>
              )}

              {/* Timer Section */}
              <SFCard className={`border-2 ${ activeTimer === lead.id ? 'border-green-500/40 bg-green-500/5' : 'border-white/10'}`}>
                <p className="text-xs font-semibold text-gray-400 mb-3">📞 콜 타이머</p>
                {activeTimer === lead.id ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-green-400 font-mono animate-pulse">
                        {String(Math.floor((timerSeconds[lead.id] || 0) / 60)).padStart(2, '0')}:{String((timerSeconds[lead.id] || 0) % 60).padStart(2, '0')}
                      </p>
                    </div>
                    <button onClick={() => stopTimer(lead.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all">
                      <Square className="h-3.5 w-3.5" /> 종료
                    </button>
                  </div>
                ) : (
                  <button onClick={() => startTimer(lead.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition-all">
                    <Play className="h-3.5 w-3.5" /> 콜 시작
                  </button>
                )}
              </SFCard>

              {/* Result Selector */}
              {showResult === lead.id && (
                <SFCard className="border-blue-500/30 bg-blue-500/5">
                  <p className="text-xs font-semibold text-gray-400 mb-3">📋 통화 결과</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {['수락', '거절', '가망', '재콜'].map(r => (
                      <button key={r} onClick={() => setSelectedResult(r)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedResult === r
                            ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => saveCallLog(lead.id)} disabled={!selectedResult}
                    className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-500/30 disabled:opacity-40 transition-all">
                    저장
                  </button>
                </SFCard>
              )}

              {/* Memo Section */}
              <SFCard className="bg-white/[0.02]">
                <p className="text-xs font-semibold text-gray-400 mb-2.5">📝 팔로우업 메모</p>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {(memos[lead.id] || []).length === 0 ? (
                    <p className="text-[10px] text-gray-600 text-center py-2">메모가 없습니다</p>
                  ) : (
                    (memos[lead.id] || []).map((m, idx) => (
                      <div key={idx} className="border-l-2 border-blue-500/30 pl-2.5 py-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{m.created_by}</span>
                          <span className="text-[10px] text-gray-600">{m.created_at?.substring(0,10)}</span>
                        </div>
                        <p className="text-[11px] text-gray-300 mt-0.5">{m.memo}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={memoInput[lead.id] || ''}
                    onChange={e => setMemoInput(p => ({ ...p, [lead.id]: e.target.value }))}
                    onKeyPress={e => e.key === 'Enter' && saveMemo(lead.id)}
                    placeholder="메모 입력..."
                    className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-[10px] placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => saveMemo(lead.id)}
                    className="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </SFCard>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">리드 추가</h3>
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["name","고객 이름",true],["phone","연락처",true]].map(([k,l,req]) => (
                  <div key={k}>
                    <label className="text-[10px] text-gray-400">{l}{req && <span className="text-red-400">*</span>}</label>
                    <input value={form[k]} onChange={set(k)} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400">유입 경로</label>
                  <select value={form.source} onChange={set("source")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    {Object.entries(SOURCE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">관심도</label>
                  <select value={form.interest_level} onChange={set("interest_level")} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
                    {["높음","중간","낮음"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400">관심 금액</label>
                <input type="number" value={form.interest_amount} onChange={set("interest_amount")} placeholder="0" className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                 <label className="text-[10px] text-gray-400">메모</label>
                 <textarea value={form.memo} onChange={set("memo")} rows={2} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs resize-none" />
               </div>
               <div>
                 <label className="text-[10px] text-gray-400">고객 태그</label>
                 <div className="flex flex-wrap gap-1.5 mt-1">
                   {PRESET_TAGS.map(tag => {
                     const isSelected = (form.tags || "").includes(tag);
                     return (
                       <button key={tag} onClick={() => toggleTag(tag)} type="button"
                         className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                           isSelected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                         }`}>
                         {tag}
                       </button>
                     );
                   })}
                 </div>
               </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={save} disabled={saving || !form.name || !form.phone}
                className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl text-xs">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}