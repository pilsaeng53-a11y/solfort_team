import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "./SFCard";
import GradeBadge from "./GradeBadge";

const GRADES = ["GREEN", "PURPLE", "GOLD", "PLATINUM"];

const tg = (text) => fetch(
  `https://api.telegram.org/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/sendMessage`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: "5757341051", text }) }
).catch(() => {});

export default function MemberManagementPanel() {
  const [section, setSection] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {["가입 승인 대기", "전체 계정 현황", "관리자 계정 생성"].map((t, i) => (
          <button key={i} onClick={() => setSection(i)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${section === i ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      {section === 0 && <PendingApprovals />}
      {section === 1 && <AllAccountsPanel />}
      {section === 2 && <AdminAccountCreate />}
    </div>
  );
}

/* ── 가입 승인 대기 ── */
function PendingApprovals() {
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [gradeMap, setGradeMap] = useState({});

  useEffect(() => {
    (async () => {
      const [d, c] = await Promise.all([
        base44.entities.DealerInfo.filter({ status: "pending" }, "-created_date", 200),
        base44.entities.CallTeamMember.filter({ status: "pending" }, "-created_date", 200),
      ]);
      setDealers(d); setCallMembers(c);
      const gm = {}; d.forEach(x => gm[x.id] = "GREEN"); setGradeMap(gm);
      setLoading(false);
    })();
  }, []);

  const approveDealer = async (id, status) => {
    setUpdating(id);
    const grade = gradeMap[id] || "GREEN";
    const d = dealers.find(x => x.id === id);
    await base44.entities.DealerInfo.update(id, { status, ...(status === "active" ? { grade } : {}) });
    if (status === "active" && d) tg(`\u2705 가입 승인\n이름: ${d.owner_name}\n역할: 대리점\n아이디: ${d.username}`);
    setDealers(prev => prev.filter(d => d.id !== id));
    setUpdating(null);
  };

  const approveCall = async (id, status) => {
    setUpdating(id);
    const m = callMembers.find(x => x.id === id);
    await base44.entities.CallTeamMember.update(id, { status });
    if (status === "active" && m) tg(`\u2705 가입 승인\n이름: ${m.name}\n역할: 콜팀\n아이디: ${m.username}`);
    setCallMembers(prev => prev.filter(m => m.id !== id));
    setUpdating(null);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      {/* 대리점 승인 대기 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">대리점 승인 대기</h3>
          {dealers.length > 0 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{dealers.length}건</span>}
        </div>
        {dealers.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">승인 대기 중인 대리점이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["가입일", "대리점명", "대리점주", "연락처", "지역", "추천코드", "등급 설정", "처리"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {dealers.map(d => (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-gray-500">{d.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                    <td className="py-3 px-2 text-gray-300">{d.owner_name}</td>
                    <td className="py-3 px-2 text-gray-400">{d.phone}</td>
                    <td className="py-3 px-2 text-gray-500">{d.region || "-"}</td>
                    <td className="py-3 px-2 text-gray-500">{d.referral_code || "-"}</td>
                    <td className="py-3 px-2">
                      <select value={gradeMap[d.id] || "GREEN"} onChange={e => setGradeMap(p => ({ ...p, [d.id]: e.target.value }))}
                        className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-[10px]">
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => approveDealer(d.id, "active")} disabled={updating === d.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                          ✅ 승인
                        </button>
                        <button onClick={() => approveDealer(d.id, "rejected")} disabled={updating === d.id}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">
                          ❌ 거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 콜팀 승인 대기 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">콜팀 승인 대기</h3>
          {callMembers.length > 0 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{callMembers.length}건</span>}
        </div>
        {callMembers.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">승인 대기 중인 콜팀원이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {["가입일", "이름", "아이디", "연락처", "소속팀", "사원번호", "처리"].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {callMembers.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                    <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                    <td className="py-3 px-2 text-gray-500">{m.username}</td>
                    <td className="py-3 px-2 text-gray-400">{m.phone}</td>
                    <td className="py-3 px-2 text-gray-400">{m.team || "-"}</td>
                    <td className="py-3 px-2 text-gray-500">{m.employee_id || "-"}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5">
                        <button onClick={() => approveCall(m.id, "active")} disabled={updating === m.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                          ✅ 승인
                        </button>
                        <button onClick={() => approveCall(m.id, "rejected")} disabled={updating === m.id}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">
                          ❌ 거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 전체 계정 현황 ── */
function AllAccountsPanel() {
  const [dealers, setDealers] = useState([]);
  const [callMembers, setCallMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");



  useEffect(() => {
    (async () => {
      const [d, c] = await Promise.all([
        base44.entities.DealerInfo.list("-created_date", 200),
        base44.entities.CallTeamMember.list("-created_date", 200),
      ]);
      setDealers(d); setCallMembers(c); setLoading(false);
    })();
  }, []);

  const updateDealer = async (id, data) => {
    setUpdating(id);
    await base44.entities.DealerInfo.update(id, data);
    setDealers(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    setUpdating(null);
  };

  const updateCall = async (id, data) => {
    setUpdating(id);
    await base44.entities.CallTeamMember.update(id, data);
    setCallMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    setUpdating(null);
  };

  const dCount = (s) => dealers.filter(d => d.status === s).length;
  const cCount = (s) => callMembers.filter(m => m.status === s).length;

  const filteredDealers = statusFilter === "all" ? dealers : dealers.filter(d => d.status === statusFilter);
  const filteredCalls = statusFilter === "all" ? callMembers : callMembers.filter(m => m.status === statusFilter);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <SFCard>
          <p className="text-xs text-gray-400 mb-2">🏪 대리점 계정</p>
          <div className="flex gap-3 text-[11px]">
            <span className="text-emerald-400">활성 {dCount("active")}</span>
            <span className="text-yellow-400">대기 {dCount("pending")}</span>
            <span className="text-red-400">정지 {dCount("suspended")}</span>
          </div>
        </SFCard>
        <SFCard>
          <p className="text-xs text-gray-400 mb-2">📞 콜팀 계정</p>
          <div className="flex gap-3 text-[11px]">
            <span className="text-emerald-400">활성 {cCount("active")}</span>
            <span className="text-yellow-400">대기 {cCount("pending")}</span>
            <span className="text-red-400">정지 {cCount("suspended")}</span>
          </div>
        </SFCard>
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 flex-wrap">
        {[["all", "전체"], ["active", "활성"], ["pending", "대기"], ["suspended", "정지"], ["dormant", "퇴출"]].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === v ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* 전체 딜러 테이블 */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">전체 딜러</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["대리점명", "대리점주", "연락처", "지역", "등급", "상태", "가입일", "등급변경", "계정관리"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredDealers.map(d => (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{d.dealer_name}</td>
                  <td className="py-3 px-2 text-gray-300">{d.owner_name}</td>
                  <td className="py-3 px-2 text-gray-400">{d.phone}</td>
                  <td className="py-3 px-2 text-gray-500">{d.region || "-"}</td>
                  <td className="py-3 px-2"><GradeBadge grade={d.grade || "GREEN"} /></td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      d.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      d.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{d.status === "active" ? "활성" : d.status === "pending" ? "대기" : d.status === "rejected" ? "거절" : "정지"}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{d.created_date?.split("T")[0]}</td>
                  <td className="py-3 px-2">
                    <select value={d.grade || "GREEN"} onChange={e => { tg(`\uD83D\uDD04 등급 변경\n이름: ${d.dealer_name}\n변경: ${d.grade || "GREEN"}\u2192${e.target.value}`); updateDealer(d.id, { grade: e.target.value }); }} disabled={updating === d.id}
                      className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-[10px] disabled:opacity-50">
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      {d.status === "pending" && (
                        <button onClick={() => { updateDealer(d.id, { status: "active" }); tg(`\u2705 가입 승인\n이름: ${d.owner_name}\n역할: 대리점\n아이디: ${d.username}`); }} disabled={updating === d.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                          ✅ 승인
                        </button>
                      )}
                      {d.status === "active" && (
                        <button onClick={() => { updateDealer(d.id, { status: "dormant" }); tg(`\uD83D\uDEAB 퇴출 처리\n이름: ${d.owner_name}\n역할: 대리점`); }} disabled={updating === d.id}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">
                          퇴출
                        </button>
                      )}
                      <button onClick={() => updateDealer(d.id, { status: d.status === "active" ? "suspended" : "active" })} disabled={updating === d.id}
                        className={`px-2 py-1 rounded text-[10px] transition-all disabled:opacity-50 ${d.status === "active" ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                        {d.status === "active" ? "정지" : "활성화"}
                      </button>
                      <button onClick={() => updateDealer(d.id, { password: "0000" })} disabled={updating === d.id}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-[10px] hover:bg-yellow-500/30 transition-all disabled:opacity-50">
                        PW초기화
                      </button>
                    </div>
                  </td>
                  </tr>
                  ))}
                  </tbody>
                  </table>
                  </div>
                  </div>

      {/* 전체 콜팀 테이블 */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">전체 콜팀</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-white/[0.06]">
              {["이름", "아이디", "팀", "연락처", "상태", "가입일", "계정관리"].map(h => (
                <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredCalls.map(m => (
                <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                  <td className="py-3 px-2 text-gray-500">{m.username}</td>
                  <td className="py-3 px-2 text-gray-400">{m.team || "-"}</td>
                  <td className="py-3 px-2 text-gray-400">{m.phone}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      m.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      m.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{m.status === "active" ? "활성" : m.status === "pending" ? "대기" : "정지"}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{m.created_date?.split("T")[0]}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      {m.status === "pending" && (
                        <button onClick={() => { updateCall(m.id, { status: "active" }); tg(`\u2705 가입 승인\n이름: ${m.name}\n역할: 콜팀\n아이디: ${m.username}`); }} disabled={updating === m.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] hover:bg-emerald-500/30 disabled:opacity-50">
                          ✅ 승인
                        </button>
                      )}
                      {m.status === "active" && (
                        <button onClick={() => { updateCall(m.id, { status: "dormant" }); tg(`\uD83D\uDEAB 퇴출 처리\n이름: ${m.name}\n역할: 콜팀`); }} disabled={updating === m.id}
                          className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50">
                          퇴출
                        </button>
                      )}
                      <button onClick={() => updateCall(m.id, { status: m.status === "active" ? "suspended" : "active" })} disabled={updating === m.id}
                        className={`px-2 py-1 rounded text-[10px] transition-all disabled:opacity-50 ${m.status === "active" ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                        {m.status === "active" ? "정지" : "활성화"}
                      </button>
                    </div>
                  </td>
                  </tr>
                  ))}
                  </tbody>
                  </table>
                  </div>
                  </div>
    </div>
  );
}

/* ── 관리자 계정 생성 ── */
function AdminAccountCreate() {
  const ROLES = [
    { value: "dealer_admin", label: "딜러 관리자", entity: "DealerInfo" },
    { value: "call_admin", label: "콜팀 관리자", entity: "CallTeamMember" },
  ];
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "dealer_admin" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password) { setError("모든 필드를 입력해주세요."); return; }
    setSaving(true); setError("");
    if (form.role === "dealer_admin") {
      await base44.entities.DealerInfo.create({
        dealer_name: form.name, owner_name: form.name, phone: "-",
        username: form.username, password: form.password,
        role: "dealer_admin", status: "active",
      });
    } else {
      await base44.entities.CallTeamMember.create({
        name: form.name, username: form.username, password: form.password,
        role: "call_admin", status: "active",
      });
    }
    setSaving(false); setDone(true);
    setForm({ name: "", username: "", password: "", role: "dealer_admin" });
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <SFCard className="max-w-md">
      <h3 className="text-sm font-semibold text-white mb-4">관리자 계정 생성</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400">역할</label>
          <div className="flex gap-2 mt-1">
            {ROLES.map(r => (
              <button key={r.value} onClick={() => setForm(p => ({ ...p, role: r.value }))}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${form.role === r.value ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {[
          { k: "name", label: "이름", placeholder: "관리자 이름" },
          { k: "username", label: "아이디", placeholder: "로그인 아이디" },
          { k: "password", label: "비밀번호", placeholder: "초기 비밀번호", type: "password" },
        ].map(f => (
          <div key={f.k}>
            <label className="text-xs text-gray-400">{f.label}</label>
            <input type={f.type || "text"} value={form[f.k]} onChange={update(f.k)} placeholder={f.placeholder}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600" />
          </div>
        ))}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button onClick={handleCreate} disabled={saving}
          className="w-full py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50">
          {done ? "✅ 계정 생성 완료" : saving ? "생성 중..." : "계정 생성"}
        </button>
      </div>
    </SFCard>
  );
}

function Loader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
}