import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import CallNav from "@/components/CallNav";
import SFCard from "@/components/SFCard";
import * as XLSX from "xlsx";
import { Upload, Phone, ChevronRight, Pause, Play, CheckCircle, SkipForward } from "lucide-react";

const COLOR_LABEL = { blue: "🔵 거절", yellow: "🟡 가망", red: "🔴 수락" };
const COLOR_BTN = {
  blue: "bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30",
  red: "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30",
};

function Loader() {
  return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /></div>;
}

export default function CallQueuePage() {
  const me = Auth.getDealerName();
  const [section, setSection] = useState("upload"); // upload | run | history
  const [activeQueue, setActiveQueue] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "SolFort - 콜 큐";
    loadQueues();
  }, []);

  const loadQueues = async () => {
    const qs = await base44.entities.CallQueue.list("-created_at", 100);
    setQueues(qs);
    setLoading(false);
  };

  const onQueueStarted = (q) => { setActiveQueue(q); setSection("run"); loadQueues(); };
  const onQueueSelect = (q) => { setActiveQueue(q); setSection("run"); };

  const active = queues.filter(q => q.status === "active" || q.status === "paused");
  const history = queues.filter(q => q.status === "completed");

  if (loading) return <><CallNav /><Loader /></>;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <CallNav />
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        {/* Section tabs */}
        <div className="flex gap-2">
          {[["upload","📁 엑셀 업로드"],["run","▶ 큐 실행"],["history","📋 이력"]].map(([k,l]) => (
            <button key={k} onClick={() => setSection(k)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${section === k ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-400 hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Active queue shortcut */}
        {active.length > 0 && section !== "run" && (
          <SFCard className="border border-emerald-500/20">
            <p className="text-xs text-emerald-400 font-semibold mb-2">진행 중인 큐</p>
            {active.map(q => (
              <div key={q.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-white font-medium">{q.session_name}</p>
                  <p className="text-[10px] text-gray-500">{q.current_index} / {q.total_count} · {q.status === "paused" ? "⏸ 일시정지" : "▶ 진행 중"}</p>
                </div>
                <button onClick={() => onQueueSelect(q)} className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg">이어하기</button>
              </div>
            ))}
          </SFCard>
        )}

        {section === "upload" && <UploadSection me={me} onStarted={onQueueStarted} />}
        {section === "run" && <RunSection activeQueue={activeQueue} me={me} queues={active} onSelectQueue={setActiveQueue} onRefresh={loadQueues} />}
        {section === "history" && <HistorySection queues={history} />}
      </div>
    </div>
  );
}

/* ── 업로드 ── */
function UploadSection({ me, onStarted }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [sessionName, setSessionName] = useState("");
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const parseFile = (f) => {
    setFile(f);
    setSessionName(f.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      const leads = json.map(row => ({
        name: row["이름"] || row["고객명"] || row["고객이름"] || row["성명"] || "",
        phone: String(row["연락처"] || row["전화번호"] || row["전화"] || row["휴대폰"] || ""),
        source: "엑셀업로드",
      })).filter(l => l.name && l.phone);
      setRows(leads);
    };
    reader.readAsArrayBuffer(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const start = async () => {
    if (!rows.length || !sessionName) return;
    setCreating(true);
    const now = new Date().toISOString();
    const queue = await base44.entities.CallQueue.create({
      session_name: sessionName, total_count: rows.length, current_index: 0,
      status: "active", created_by: me, created_at: now,
    });
    for (let i = 0; i < rows.length; i++) {
      await base44.entities.CallLead.create({
        ...rows[i], status: "신규", assigned_to: me, created_by: me,
        created_at: now, queue_id: queue.id, queue_index: i,
      });
    }
    setCreating(false);
    onStarted(queue);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}
      >
        <Upload className="h-8 w-8 text-gray-500 mx-auto mb-3" />
        <p className="text-sm text-gray-400">엑셀 파일을 드래그하거나 클릭하여 업로드</p>
        <p className="text-xs text-gray-600 mt-1">.xlsx / .xls / .csv 지원</p>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files[0] && parseFile(e.target.files[0])} />
      </div>

      {rows.length > 0 && (
        <SFCard>
          <p className="text-sm font-semibold text-white mb-3">
            총 <span className="text-emerald-400">{rows.length}건</span> 인식됨
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                <th className="text-left py-2 px-2">이름</th>
                <th className="text-left py-2 px-2">연락처</th>
              </tr></thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-2 px-2 text-white">{r.name}</td>
                    <td className="py-2 px-2 text-gray-400">{r.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && <p className="text-[10px] text-gray-600 mt-1 px-2">... 외 {rows.length - 5}건</p>}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400">세션 이름</label>
              <input value={sessionName} onChange={e => setSessionName(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={start} disabled={creating}
              className="w-full h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-40 transition-all">
              {creating ? `생성 중... (${rows.length}건)` : "▶ 콜 큐 시작"}
            </button>
          </div>
        </SFCard>
      )}
    </div>
  );
}

/* ── 큐 실행 ── */
function RunSection({ activeQueue, me, queues, onSelectQueue, onRefresh }) {
  const [queue, setQueue] = useState(activeQueue);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState("");
  const [tagging, setTagging] = useState(false);

  useEffect(() => {
    if (queue) loadLeads(queue);
  }, [queue]);

  const loadLeads = async (q) => {
    setLoading(true);
    const all = await base44.entities.CallLead.filter({ queue_id: q.id }, "queue_index", 1000);
    setLeads(all);
    setLoading(false);
  };

  const current = queue ? leads.find(l => l.queue_index === (queue.current_index || 0)) : null;

  const blue = leads.filter(l => l.color_tag === "blue").length;
  const yellow = leads.filter(l => l.color_tag === "yellow").length;
  const red = leads.filter(l => l.color_tag === "red").length;
  const untagged = leads.filter(l => !l.color_tag && l.queue_index < (queue?.current_index || 0)).length;

  const advance = async (colorTag) => {
    if (!queue || !current) return;
    setTagging(true);
    if (colorTag) {
      await base44.entities.CallLead.update(current.id, { color_tag: colorTag, color_tag_memo: memo });
    }
    const nextIdx = (queue.current_index || 0) + 1;
    const isCompleted = nextIdx >= queue.total_count;
    const update = {
      current_index: nextIdx,
      ...(isCompleted ? { status: "completed", completed_at: new Date().toISOString() } : {}),
    };
    await base44.entities.CallQueue.update(queue.id, update);
    const newQ = { ...queue, ...update };
    setQueue(newQ);
    setLeads(prev => colorTag ? prev.map(l => l.id === current.id ? { ...l, color_tag: colorTag, color_tag_memo: memo } : l) : prev);
    setMemo("");
    setTagging(false);
    onRefresh();
  };

  const togglePause = async () => {
    const newStatus = queue.status === "paused" ? "active" : "paused";
    await base44.entities.CallQueue.update(queue.id, { status: newStatus });
    setQueue(prev => ({ ...prev, status: newStatus }));
    onRefresh();
  };

  const pct = queue ? Math.round(((queue.current_index || 0) / (queue.total_count || 1)) * 100) : 0;

  if (!queue) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400">진행할 큐를 선택하세요</p>
        {queues.length === 0 && <p className="text-xs text-gray-600 py-8 text-center">활성 큐가 없습니다. 엑셀 업로드로 큐를 만드세요.</p>}
        {queues.map(q => (
          <SFCard key={q.id} className="cursor-pointer hover:border-white/20 transition-all" onClick={() => { setQueue(q); loadLeads(q); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{q.session_name}</p>
                <p className="text-xs text-gray-500">{q.current_index} / {q.total_count} · {q.status === "paused" ? "⏸ 일시정지" : "▶ 진행 중"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </div>
          </SFCard>
        ))}
      </div>
    );
  }

  if (loading) return <Loader />;

  const isCompleted = queue.status === "completed" || (queue.current_index || 0) >= queue.total_count;

  return (
    <div className="space-y-4">
      {/* 진행 표시 */}
      <SFCard>
        {queue.status === "paused" && (
          <p className="text-xs text-yellow-400 font-semibold mb-1">⏸ 이어서 진행 중</p>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold text-white truncate">{queue.session_name}</p>
          <p className="text-xs text-gray-400 shrink-0 ml-2">{queue.current_index || 0} / {queue.total_count}</p>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div className="bg-emerald-400 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-right text-[10px] text-gray-500 mt-1">{pct}%</p>
      </SFCard>

      {/* 사이드 집계 */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[["🔵","거절",blue,"text-blue-400"],["🟡","가망",yellow,"text-yellow-400"],["🔴","수락",red,"text-red-400"],["⚪","미처리",untagged,"text-gray-400"]].map(([e,l,v,c]) => (
          <SFCard key={l} className="py-2">
            <p className="text-[10px] text-gray-600">{e} {l}</p>
            <p className={`text-lg font-bold ${c}`}>{v}</p>
          </SFCard>
        ))}
      </div>

      {/* 현재 고객 카드 */}
      {isCompleted ? (
        <SFCard className="border border-emerald-500/30 text-center py-10">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-white">큐 완료!</p>
          <p className="text-xs text-gray-500 mt-1">{queue.total_count}건 모두 처리됨</p>
          <button onClick={() => setQueue(null)} className="mt-4 text-xs text-gray-400 hover:text-white">다른 큐 선택</button>
        </SFCard>
      ) : current ? (
        <SFCard className="space-y-4">
          <div className="text-center pt-2">
            <p className="text-4xl font-bold text-white mb-1">{current.name}</p>
            <p className="text-xl text-gray-400">{current.phone}</p>
          </div>

          {/* 전화걸기 */}
          <a href={`tel:${(current.phone || "").replace(/-/g, "")}`}
            className="flex items-center justify-center gap-3 w-full h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-lg font-bold hover:bg-emerald-500/30 active:scale-95 transition-all">
            <Phone className="h-6 w-6" /> 전화걸기
          </a>

          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-xs text-gray-500 text-center mb-3">결과 태깅</p>
            <div className="grid grid-cols-3 gap-2">
              {[["blue","🔵 거절"],["yellow","🟡 가망"],["red","🔴 수락"]].map(([tag, label]) => (
                <button key={tag} onClick={() => advance(tag)} disabled={tagging}
                  className={`h-12 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all active:scale-95 ${COLOR_BTN[tag]}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* 노란 태깅 시 문자 버튼 */}
            <a href={`sms:${(current.phone || "").replace(/-/g, "")}?body=${encodeURIComponent("안녕하세요, SolFort입니다. 상담 관련하여 문자 남깁니다.")}`}
              className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-xl text-xs hover:bg-yellow-500/20 transition-all">
              📩 문자 보내기
            </a>
          </div>

          <div>
            <label className="text-[10px] text-gray-400">메모</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm resize-none placeholder:text-gray-600"
              placeholder="통화 메모 (선택)" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => advance(null)} disabled={tagging}
              className="flex-1 flex items-center justify-center gap-2 h-11 bg-white/5 text-gray-300 border border-white/10 rounded-xl text-sm hover:bg-white/10 active:scale-95 disabled:opacity-40 transition-all">
              <SkipForward className="h-4 w-4" /> 다음
            </button>
            <button onClick={togglePause} disabled={tagging}
              className="flex-1 flex items-center justify-center gap-2 h-11 bg-white/5 text-gray-300 border border-white/10 rounded-xl text-sm hover:bg-white/10 active:scale-95 transition-all">
              {queue.status === "paused" ? <><Play className="h-4 w-4" /> 재개</> : <><Pause className="h-4 w-4" /> 일시정지</>}
            </button>
          </div>
        </SFCard>
      ) : (
        <SFCard className="text-center py-8">
          <p className="text-xs text-gray-600">데이터를 불러오는 중...</p>
        </SFCard>
      )}
    </div>
  );
}

/* ── 이력 ── */
function HistorySection({ queues }) {
  const [detail, setDetail] = useState(null);
  const [detailLeads, setDetailLeads] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openDetail = async (q) => {
    setDetail(q); setLoadingDetail(true);
    const leads = await base44.entities.CallLead.filter({ queue_id: q.id }, "queue_index", 1000);
    setDetailLeads(leads); setLoadingDetail(false);
  };

  if (detail) {
    const blue = detailLeads.filter(l => l.color_tag === "blue").length;
    const yellow = detailLeads.filter(l => l.color_tag === "yellow").length;
    const red = detailLeads.filter(l => l.color_tag === "red").length;
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="text-xs text-gray-400 hover:text-white">← 목록으로</button>
        <SFCard>
          <p className="text-sm font-bold text-white mb-1">{detail.session_name}</p>
          <p className="text-xs text-gray-500">{detail.current_index} / {detail.total_count}</p>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[["🔵 거절",blue,"text-blue-400"],["🟡 가망",yellow,"text-yellow-400"],["🔴 수락",red,"text-red-400"]].map(([l,v,c]) => (
              <div key={l} className="bg-white/[0.03] rounded-xl py-2">
                <p className={`text-lg font-bold ${c}`}>{v}</p>
                <p className="text-[10px] text-gray-500">{l}</p>
              </div>
            ))}
          </div>
        </SFCard>
        {loadingDetail ? <Loader /> : (
          <div className="space-y-1">
            {detailLeads.map(l => (
              <div key={l.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border-l-4 ${l.color_tag === "blue" ? "border-blue-500" : l.color_tag === "yellow" ? "border-yellow-500" : l.color_tag === "red" ? "border-red-500" : "border-transparent"}`}>
                <span className="text-sm text-white font-medium flex-1">{l.name}</span>
                <span className="text-xs text-gray-500">{l.phone}</span>
                {l.color_tag && <span className="text-[10px]">{COLOR_LABEL[l.color_tag]}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queues.length === 0 && <p className="text-xs text-gray-600 text-center py-8">완료된 큐가 없습니다</p>}
      {queues.map(q => (
        <SFCard key={q.id} className="cursor-pointer hover:border-white/20 transition-all" onClick={() => openDetail(q)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{q.session_name}</p>
              <p className="text-xs text-gray-500">{q.current_index} / {q.total_count} · {(q.created_at || "").split("T")[0]}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">완료</span>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </div>
          </div>
        </SFCard>
      ))}
    </div>
  );
}