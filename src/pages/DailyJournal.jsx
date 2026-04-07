import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "@/components/SFCard";
import { toast } from "sonner";

const BOT_TOKEN = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
const CHAT_ID = "5757341051";

export default function DailyJournal() {
  const [form, setForm] = useState({
    good_points: "",
    bad_points: "",
    tomorrow_goal: "",
    today_sales: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [journals, setJournals] = useState([]);
  const [allJournals, setAllJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("mine");
  const [filterTeam, setFilterTeam] = useState("");

  useEffect(() => {
    const initData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Load user's journals
        const userJournals = await base44.entities.DailyJournal.filter(
          { created_by: currentUser.email || currentUser.username },
          "-written_at",
          100
        );
        setJournals(userJournals);

        // Load all journals for super_admin/managers
        if (currentUser.role === "super_admin" || currentUser.role === "manager" || currentUser.role === "call_admin" || currentUser.role === "dealer_admin") {
          const all = await base44.entities.DailyJournal.list("-written_at", 500);
          setAllJournals(all);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
      setLoading(false);
    };
    initData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.good_points.trim() || !form.bad_points.trim() || !form.tomorrow_goal.trim()) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const entry = {
        author: user?.full_name || user?.username || "Unknown",
        role: user?.role || "",
        position: JSON.parse(localStorage.getItem("sf_dealer") || "{}")?.position || "",
        good_points: form.good_points,
        bad_points: form.bad_points,
        tomorrow_goal: form.tomorrow_goal,
        today_sales: form.today_sales || 0,
        written_at: new Date().toISOString(),
        parent_id: user?.parent_id || "",
        parent_name: user?.parent_name || "",
      };

      const created = await base44.entities.DailyJournal.create(entry);
      setJournals([created, ...journals]);

      // Send Telegram
      const telegramText = `📝 일지 등록
작성자: ${entry.author} (${entry.position})
✅잘한것: ${form.good_points}
⚠️아쉬운점: ${form.bad_points}
🎯내일목표: ${form.tomorrow_goal}`;

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: telegramText }),
      }).catch(() => {});

      setForm({ good_points: "", bad_points: "", tomorrow_goal: "", today_sales: 0 });
      toast.success("일지가 저장되었습니다.");
    } catch (e) {
      toast.error("저장 실패: " + e.message);
    }
    setSubmitting(false);
  };

  const displayJournals = viewMode === "mine" ? journals : allJournals.filter(j => !filterTeam || j.parent_name === filterTeam);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const uniqueTeams = [...new Set(allJournals.map(j => j.parent_name).filter(Boolean))];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Form */}
      <SFCard className="border border-emerald-500/20">
        <h2 className="text-lg font-bold text-white mb-4">📝 오늘의 일지</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-2">✅ 오늘 잘한 것</label>
            <textarea
              value={form.good_points}
              onChange={e => setForm(p => ({ ...p, good_points: e.target.value }))}
              placeholder="오늘 잘했던 부분을 작성해주세요"
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">⚠️ 아쉬운 점 / 문제점</label>
            <textarea
              value={form.bad_points}
              onChange={e => setForm(p => ({ ...p, bad_points: e.target.value }))}
              placeholder="개선이 필요한 부분을 작성해주세요"
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">🎯 내일 목표</label>
            <textarea
              value={form.tomorrow_goal}
              onChange={e => setForm(p => ({ ...p, tomorrow_goal: e.target.value }))}
              placeholder="내일의 목표를 작성해주세요"
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">💰 오늘 매출/성과</label>
            <input
              type="number"
              value={form.today_sales}
              onChange={e => setForm(p => ({ ...p, today_sales: Number(e.target.value) }))}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-semibold hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
          >
            {submitting ? "저장 중..." : "✅ 일지 저장"}
          </button>
        </form>
      </SFCard>

      {/* View Toggle */}
      {(user?.role === "super_admin" || user?.role === "manager" || user?.role === "call_admin" || user?.role === "dealer_admin") && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode("mine")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "mine"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-gray-400"
            }`}
          >
            내 일지
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "all"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-gray-400"
            }`}
          >
            전체 일지
          </button>
          {viewMode === "all" && uniqueTeams.length > 0 && (
            <select
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
              className="ml-auto bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">전체 팀</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Journal List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">
          {viewMode === "mine" ? "내 일지" : "전체 일지"} ({displayJournals.length}건)
        </h3>
        {displayJournals.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">등록된 일지가 없습니다</p>
        ) : (
          displayJournals.map(journal => (
            <SFCard
              key={journal.id}
              className="border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold">{journal.author}</p>
                  <p className="text-xs text-gray-500">{journal.position} · {(journal.written_at || "").split("T")[0]}</p>
                </div>
                {viewMode === "all" && (
                  <span className={`px-2 py-1 rounded text-[10px] font-medium ${
                    journal.is_read
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {journal.is_read ? "읽음" : "미읽음"}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-400 mb-1">✅ 잘한 것</p>
                  <p className="text-gray-300 line-clamp-3">{journal.good_points}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">⚠️ 아쉬운 점</p>
                  <p className="text-gray-300 line-clamp-3">{journal.bad_points}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">🎯 내일 목표</p>
                  <p className="text-gray-300 line-clamp-3">{journal.tomorrow_goal}</p>
                </div>
              </div>

              {journal.today_sales > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-500">💰 오늘 매출: <span className="text-emerald-400 font-semibold">₩{journal.today_sales.toLocaleString()}</span></p>
                </div>
              )}
            </SFCard>
          ))
        )}
      </div>
    </div>
  );
}