import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import SFCard from "@/components/SFCard";

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "SF";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function ReferralCode() {
  const [user, setUser] = useState(null);
  const [myCode, setMyCode] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [downline, setDownline] = useState([]);
  const [expandedMembers, setExpandedMembers] = useState({});
  const [parentInput, setParentInput] = useState("");
  const [submittingParent, setSubmittingParent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "SolFort - 추천코드 관리";
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      
      // Get or generate referral code
      let code = u.my_referral_code;
      if (!code) {
        code = generateCode();
        // Don't auto-save, wait for user to pick from candidates
      }
      setMyCode(code);

      // Load downline
      if (code) {
        const [dealers, callTeam, online] = await Promise.all([
          base44.entities.DealerInfo.filter(
            { $or: [{ parent_code: code }, { referral_code_used: code }] },
            "-created_date",
            100
          ).catch(() => []),
          base44.entities.CallTeamMember.filter(
            { $or: [{ parent_code: code }, { referral_code_used: code }] },
            "-created_date",
            100
          ).catch(() => []),
          base44.entities.OnlineTeamMember.filter(
            { $or: [{ parent_code: code }, { referral_code_used: code }] },
            "-created_date",
            100
          ).catch(() => []),
        ]);
        const all = [
          ...dealers.map((d) => ({
            ...d,
            type: "dealer",
            display_name: d.dealer_name,
            role: "대리점",
            position: d.owner_name,
          })),
          ...callTeam.map((c) => ({
            ...c,
            type: "callteam",
            display_name: c.name,
            role: "콜팀",
            position: c.team,
          })),
          ...online.map((o) => ({
            ...o,
            type: "online",
            display_name: o.name,
            role: "온라인팀",
            position: "",
          })),
        ];
        setDownline(all);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateCandidates = () => {
    const codes = [];
    for (let i = 0; i < 5; i++) {
      codes.push(generateCode());
    }
    setCandidates(codes);
    setSelecting(true);
  };

  const selectCode = async (code) => {
    try {
      await base44.auth.updateMe({ my_referral_code: code });
      setMyCode(code);
      setCandidates([]);
      setSelecting(false);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = () => {
    const text = `SolFort에서 함께 성장해요! 추천코드: ${myCode}`;
    navigator.clipboard.writeText(text);
  };

  const submitParentCode = async () => {
    if (!parentInput.trim()) return;
    setSubmittingParent(true);
    try {
      const dealers = await base44.entities.DealerInfo.filter({
        my_referral_code: parentInput.toUpperCase(),
      }).catch(() => []);
      const callTeam = await base44.entities.CallTeamMember.filter({
        my_referral_code: parentInput.toUpperCase(),
      }).catch(() => []);
      const online = await base44.entities.OnlineTeamMember.filter({
        my_referral_code: parentInput.toUpperCase(),
      }).catch(() => []);

      const parent = dealers[0] || callTeam[0] || online[0];
      if (!parent) {
        alert("존재하지 않는 추천코드입니다.");
        setSubmittingParent(false);
        return;
      }

      await base44.auth.updateMe({ parent_id: parent.id, referral_code_used: parentInput.toUpperCase() });
      setParentInput("");
      alert("추천인이 연결되었습니다!");
      await loadData();
    } catch (e) {
      console.error(e);
    }
    setSubmittingParent(false);
  };

  const toggleExpand = async (memberId) => {
    if (expandedMembers[memberId]) {
      setExpandedMembers((p) => ({ ...p, [memberId]: false }));
      return;
    }

    const member = downline.find((m) => m.id === memberId);
    if (!member || !member.my_referral_code) {
      setExpandedMembers((p) => ({ ...p, [memberId]: false }));
      return;
    }

    try {
      const [dealers, callTeam, online] = await Promise.all([
        base44.entities.DealerInfo.filter(
          { $or: [{ parent_code: member.my_referral_code }, { referral_code_used: member.my_referral_code }] },
          "-created_date",
          100
        ).catch(() => []),
        base44.entities.CallTeamMember.filter(
          { $or: [{ parent_code: member.my_referral_code }, { referral_code_used: member.my_referral_code }] },
          "-created_date",
          100
        ).catch(() => []),
        base44.entities.OnlineTeamMember.filter(
          { $or: [{ parent_code: member.my_referral_code }, { referral_code_used: member.my_referral_code }] },
          "-created_date",
          100
        ).catch(() => []),
      ]);

      const downlineMembers = [
        ...dealers.map((d) => ({
          ...d,
          type: "dealer",
          display_name: d.dealer_name,
          role: "대리점",
          position: d.owner_name,
        })),
        ...callTeam.map((c) => ({
          ...c,
          type: "callteam",
          display_name: c.name,
          role: "콜팀",
          position: c.team,
        })),
        ...online.map((o) => ({
          ...o,
          type: "online",
          display_name: o.name,
          role: "온라인팀",
          position: "",
        })),
      ];

      setExpandedMembers((p) => ({
        ...p,
        [memberId]: { members: downlineMembers, loaded: true },
      }));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center pb-20">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#080a12] pb-20">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* SECTION 1: 내 추천코드 */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">📌 내 추천코드</h2>
          {myCode && !selecting ? (
            <SFCard className="bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">내 추천코드</p>
                  <p className="text-3xl font-bold text-emerald-400">{myCode}</p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"
                >
                  <Copy className="h-4 w-4" />
                  공유
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">공유 텍스트: SolFort에서 함께 성장해요! 추천코드: {myCode}</p>
            </SFCard>
          ) : (
            <SFCard>
              {!selecting ? (
                <button
                  onClick={generateCandidates}
                  className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-semibold hover:bg-emerald-500/30 transition-all"
                >
                  추천코드 생성
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white mb-3">코드를 선택하세요</p>
                  {candidates.map((code) => (
                    <button
                      key={code}
                      onClick={() => selectCode(code)}
                      className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-semibold hover:bg-emerald-500/30 transition-all"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </SFCard>
          )}
        </div>

        {/* SECTION 2: 내 하부 현황 */}
        {myCode && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-white">👥 내 하부 현황</h2>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-semibold">
                직추천 {downline.length}명
              </span>
            </div>
            {downline.length === 0 ? (
              <SFCard>
                <p className="text-center text-gray-500 text-sm py-6">아직 하부가 없습니다</p>
              </SFCard>
            ) : (
              <div className="space-y-2">
                {downline.map((member) => (
                  <div key={member.id} className="space-y-1">
                    <button
                      onClick={() => toggleExpand(member.id)}
                      className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <div>
                          <p className="text-sm font-semibold text-white">{member.display_name}</p>
                          <p className="text-xs text-gray-500">{member.role} • {member.position || "-"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{member.created_date?.split("T")[0]}</p>
                          <p className="text-sm font-semibold text-emerald-400">₩0</p>
                        </div>
                        {member.my_referral_code && (
                          <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform ${
                              expandedMembers[member.id] ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {expandedMembers[member.id]?.loaded && (
                      <div className="pl-4 space-y-1">
                        {expandedMembers[member.id].members.length === 0 ? (
                          <p className="text-xs text-gray-600 py-2">하부가 없습니다</p>
                        ) : (
                          expandedMembers[member.id].members.map((sub) => (
                            <div
                              key={sub.id}
                              className="p-2 bg-white/[0.03] border border-white/5 rounded text-xs text-gray-400"
                            >
                              <p className="font-semibold text-gray-300">{sub.display_name}</p>
                              <p>{sub.role} • {sub.position || "-"} • {sub.created_date?.split("T")[0]}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: 추천코드 입력 */}
        {!user?.parent_id && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">🔗 추천인 연결</h2>
            <SFCard>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">추천인의 코드를 입력하세요</label>
                  <input
                    type="text"
                    value={parentInput}
                    onChange={(e) => setParentInput(e.target.value.toUpperCase())}
                    placeholder="예: SF4X2K"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 text-sm"
                  />
                </div>
                <button
                  onClick={submitParentCode}
                  disabled={submittingParent || !parentInput.trim()}
                  className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                >
                  {submittingParent ? "연결 중..." : "추천인 연결"}
                </button>
              </div>
            </SFCard>
          </div>
        )}
      </div>
    </div>
  );
}