import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SFCard from "@/components/SFCard";
import { toast } from "sonner";
import { Star } from "lucide-react";

const BOT_TOKEN = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
const CHAT_ID = "5757341051";

export default function CustomerSatisfaction() {
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    staff_name: "",
  });
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    const initData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Load reviews
        const allReviews = await base44.entities.CustomerReview.list("-reviewed_at", 200).catch(() => []);
        const filtered = currentUser.role === "super_admin" 
          ? allReviews 
          : allReviews.filter(r => r.created_by === currentUser.email || r.created_by === currentUser.username);
        setReviews(filtered);

        // Extract unique staff names
        const staffNames = [...new Set(allReviews.map(r => r.staff_name).filter(Boolean))];
        setStaffList(staffNames);
      } catch (e) {
        console.error("Failed to load data", e);
      }
      setLoading(false);
    };
    initData();
  }, []);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.phone.trim() || !form.staff_name.trim()) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setSending(true);
    try {
      // Create request record
      await base44.entities.SatisfactionRequest.create({
        customer_name: form.customer_name,
        phone: form.phone,
        staff_name: form.staff_name,
        sent_at: new Date().toISOString(),
      });

      // Send Telegram
      const telegramText = `안녕하세요! SolFort 서비스 이용 고객님께 만족도 평가를 요청드립니다.

담당: ${form.staff_name}

아래 양식으로 평가해 주세요:
이름: (고객님 성함)
별점: (1~5개 숫자)
평가: (선택사항 - 한줄 소감)

예시:
이름: 홍길동
별점: 5
평가: 매우 친절했습니다`;

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: telegramText }),
      }).catch(() => {});

      setForm({ customer_name: "", phone: "", staff_name: "" });
      toast.success("만족도 요청이 발송되었습니다.");
    } catch (e) {
      toast.error("발송 실패: " + e.message);
    }
    setSending(false);
  };

  const displayReviews = filterStaff 
    ? reviews.filter(r => r.staff_name === filterStaff)
    : reviews;

  const avgRating = displayReviews.length > 0
    ? (displayReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / displayReviews.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Request Section */}
      <SFCard className="border border-blue-500/20">
        <h2 className="text-lg font-bold text-white mb-4">📨 만족도 요청 발송</h2>
        <form onSubmit={handleSendRequest} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2">고객명</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                placeholder="고객명"
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">연락처</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="010-1234-5678"
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">담당직원명</label>
              <input
                type="text"
                value={form.staff_name}
                onChange={e => setForm(p => ({ ...p, staff_name: e.target.value }))}
                placeholder="담당자 이름"
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-semibold hover:bg-blue-500/30 disabled:opacity-50 transition-all"
          >
            {sending ? "발송 중..." : "📨 만족도 요청 발송"}
          </button>
        </form>
      </SFCard>

      {/* Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">📊 수집된 평가</h2>
            <p className="text-sm text-gray-500 mt-1">평균 별점: {avgRating} ⭐</p>
          </div>
          {(user?.role === "super_admin" && staffList.length > 0) && (
            <select
              value={filterStaff}
              onChange={e => setFilterStaff(e.target.value)}
              className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">전체 직원</option>
              {staffList.map(staff => (
                <option key={staff} value={staff}>{staff}</option>
              ))}
            </select>
          )}
        </div>

        {displayReviews.length === 0 ? (
          <SFCard className="text-center py-12 border border-white/10">
            <p className="text-sm text-gray-600">수집된 평가가 없습니다.</p>
          </SFCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayReviews.map(review => (
              <SFCard key={review.id} className="border border-blue-500/20 hover:border-blue-500/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">{review.customer_name}</p>
                    <p className="text-xs text-gray-500">{review.staff_name} · {(review.reviewed_at || "").split("T")[0]}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}
                      />
                    ))}
                  </div>
                </div>

                {review.review_text && (
                  <p className="text-sm text-gray-300 leading-relaxed">{review.review_text}</p>
                )}
              </SFCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}