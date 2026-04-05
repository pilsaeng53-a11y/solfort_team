import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";

const today = new Date().toISOString().split("T")[0];

export default function AttendanceWidget() {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const recs = await base44.entities.AttendanceLog.filter({
        work_date: today,
        username: Auth.getDealerName(),
      });
      setRecord(recs[0] || null);
    } catch {}
    setLoading(false);
  };

  const checkIn = async () => {
    setProcessing(true);
    const now = new Date().toISOString();
    try {
      const rec = await base44.entities.AttendanceLog.create({
        member_name: Auth.getDealerName(),
        username: Auth.getDealerName(),
        check_in_at: now,
        work_date: today,
        status: "working",
      });
      setRecord(rec);
      // Telegram notification
      const botToken = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
      const chatId = "5757341051";
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `[${Auth.getDealerName()}] 출근`,
        }),
      }).catch(() => {});
    } catch {}
    setProcessing(false);
  };

  const checkOut = async () => {
    if (!record) return;
    setProcessing(true);
    const now = new Date().toISOString();
    const hours = ((Date.now() - new Date(record.check_in_at)) / 3600000).toFixed(1);
    try {
      await base44.entities.AttendanceLog.update(record.id, {
        check_out_at: now,
        status: "off",
      });
      setRecord({ ...record, check_out_at: now, status: "off" });
      // Telegram notification
      const botToken = "8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8";
      const chatId = "5757341051";
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `[${Auth.getDealerName()}] 퇴근 근무${hours}시간`,
        }),
      }).catch(() => {});
    } catch {}
    setProcessing(false);
  };

  if (loading) return <span className="text-[10px] text-gray-500">로딩 중...</span>;

  if (!record) {
    return (
      <button
        onClick={checkIn}
        disabled={processing}
        className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50"
      >
        📍 출근하기
      </button>
    );
  }

  if (record.status === "working") {
    const inTime = new Date(record.check_in_at).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-emerald-400">✅ 출근중 {inTime}~</span>
        <button
          onClick={checkOut}
          disabled={processing}
          className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg hover:bg-red-500/30 disabled:opacity-50"
        >
          퇴근
        </button>
      </div>
    );
  }

  return <span className="text-[10px] text-gray-500">퇴근 완료</span>;
}