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
    const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
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
      fetch("https://solfort-js.onrender.com/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `📍 [${Auth.getDealerName()}] 출근\n시간: ${time}`,
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
      fetch("https://solfort-js.onrender.com/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `🏠 [${Auth.getDealerName()}] 퇴근\n근무시간: ${hours}시간`,
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
        <span className="text-[10px] text-emerald-400">✅ 출근 중 {inTime}~</span>
        <button
          onClick={checkOut}
          disabled={processing}
          className="text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2.5 py-1 rounded-lg hover:bg-gray-500/30 disabled:opacity-50"
        >
          퇴근
        </button>
      </div>
    );
  }

  return <span className="text-[10px] text-gray-500">퇴근 완료</span>;
}