import { useState, useRef } from "react";
import { read, utils } from "xlsx";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";
import { toast } from "sonner";

const STATUS_MAP = { 수락: "전환완료", 거절: "거절", 가망: "재콜예정" };
const STATUS_STYLE = {
  수락: "bg-green-900/40 border-l-4 border-green-500",
  거절: "bg-red-900/40 border-l-4 border-red-500",
  가망: "bg-yellow-900/40 border-l-4 border-yellow-500",
};

function getRowStyle(status) {
  return STATUS_STYLE[status] || "bg-gray-800";
}

function StatsCards({ rows }) {
  const counts = rows.reduce((acc, r) => {
    const k = r.상태 || "미분류";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const cards = [
    { key: "수락", label: "수락", color: "text-green-400 border-green-500/30 bg-green-500/10" },
    { key: "거절", label: "거절", color: "text-red-400 border-red-500/30 bg-red-500/10" },
    { key: "가망", label: "가망", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
    { key: "미분류", label: "미분류", color: "text-gray-400 border-gray-500/30 bg-gray-500/10" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {cards.map(c => (
        <div key={c.key} className={`rounded-xl border p-3 text-center ${c.color}`}>
          <p className="text-lg font-bold">{counts[c.key] || 0}건</p>
          <p className="text-[10px] mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function PreviewTable({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] mb-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-white/[0.08] bg-[#0d0f1a]">
            {["이름", "연락처", "상태", "금액", "메모"].map(h => (
              <th key={h} className="text-left py-2.5 px-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`${getRowStyle(r.상태)} border-b border-white/[0.04]`}>
              <td className="py-2 px-3 text-white font-medium">{r.이름 || "-"}</td>
              <td className="py-2 px-3 text-gray-300">{r.연락처 || "-"}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  r.상태 === "수락" ? "bg-green-500/20 text-green-400" :
                  r.상태 === "거절" ? "bg-red-500/20 text-red-400" :
                  r.상태 === "가망" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>{r.상태 || "미분류"}</span>
              </td>
              <td className="py-2 px-3 text-gray-400">{r.금액 ? `₩${Number(r.금액).toLocaleString()}` : "-"}</td>
              <td className="py-2 px-3 text-gray-500 max-w-[160px] truncate">{r.메모 || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function registerRows(rows) {
  const assignedTo = Auth.getDealerName();
  const now = new Date().toISOString();
  let success = 0;
  for (const r of rows) {
    if (!r.이름 || !r.연락처) continue;
    await base44.entities.CallLead.create({
      name: r.이름,
      phone: String(r.연락처),
      status: STATUS_MAP[r.상태] || "신규",
      interest_amount: r.금액 ? Number(r.금액) : undefined,
      memo: r.메모 || "",
      assigned_to: assignedTo,
      source: "엑셀업로드",
      created_at: now,
      created_by: assignedTo,
    });
    success++;
  }
  return success;
}

function ExcelTab() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [registering, setRegistering] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = read(ev.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json(ws, { defval: "" });
      const parsed = data.map(row => ({
        이름: String(row["이름"] || row["name"] || ""),
        연락처: String(row["연락처"] || row["phone"] || ""),
        금액: row["금액"] || row["amount"] || "",
        상태: String(row["상태"] || row["status"] || ""),
        메모: String(row["메모"] || row["memo"] || ""),
      })).filter(r => r.이름 || r.연락처);
      setRows(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRegister = async () => {
    if (!rows.length) return;
    setRegistering(true);
    const n = await registerRows(rows);
    toast.success(`${n}건 등록 완료`);
    setRows([]);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
    setRegistering(false);
  };

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500/50 transition-all"
      >
        <p className="text-2xl mb-2">📂</p>
        <p className="text-sm text-gray-400">{fileName || "엑셀 파일 선택 (.xlsx / .xls)"}</p>
        <p className="text-[10px] text-gray-600 mt-1">이름, 연락처, 상태, 금액, 메모 컬럼 지원</p>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />

      {rows.length > 0 && (
        <>
          <StatsCards rows={rows} />
          <PreviewTable rows={rows} />
          <button
            onClick={handleRegister}
            disabled={registering}
            className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
          >
            {registering ? "등록 중..." : `📋 ${rows.length}건 CallLead 등록`}
          </button>
        </>
      )}
    </div>
  );
}

function ManualTab() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState([]);
  const [registering, setRegistering] = useState(false);

  const STATUS_KEYWORDS = ["수락", "거절", "가망"];

  const parseText = () => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      const 이름 = parts[0] || "";
      const 연락처 = parts[1] || "";
      const statusRaw = parts[2] || "";
      const 상태 = STATUS_KEYWORDS.find(k => statusRaw.includes(k)) || "";
      const 금액 = parts[3] || "";
      return { 이름, 연락처, 상태, 금액, 메모: "" };
    }).filter(r => r.이름 || r.연락처);
    setRows(parsed);
  };

  const handleRegister = async () => {
    if (!rows.length) return;
    setRegistering(true);
    const n = await registerRows(rows);
    toast.success(`${n}건 등록 완료`);
    setRows([]);
    setText("");
    setRegistering(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-400 block mb-1">이름, 연락처, 상태, 금액 — 한 줄에 한 명</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={10}
          placeholder={"홍길동, 01012345678, 수락, 5000000\n김영희, 01098765432, 가망\n이철수, 01011112222, 거절"}
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-xs placeholder:text-gray-600 resize-none font-mono"
        />
      </div>
      <button
        onClick={parseText}
        className="w-full py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-all"
      >
        🔍 미리보기
      </button>

      {rows.length > 0 && (
        <>
          <StatsCards rows={rows} />
          <PreviewTable rows={rows} />
          <button
            onClick={handleRegister}
            disabled={registering}
            className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
          >
            {registering ? "등록 중..." : `📋 ${rows.length}건 CallLead 등록`}
          </button>
        </>
      )}
    </div>
  );
}

export default function LeadExcelUpload() {
  const [tab, setTab] = useState("excel");

  return (
    <div className="min-h-screen bg-[#080a12] pb-24">
      <div className="sticky top-0 z-20 bg-[#080a12]/95 border-b border-white/[0.06] px-4 py-3">
        <h1 className="text-base font-bold text-white">📥 리드 업로드</h1>
        <p className="text-[10px] text-gray-500">엑셀 또는 직접 입력으로 CallLead 대량 등록</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        <div className="flex gap-2 mb-5">
          {[["excel", "📂 엑셀 업로드"], ["manual", "✏️ 직접 입력"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                tab === k
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "excel" ? <ExcelTab /> : <ManualTab />}
      </div>
    </div>
  );
}