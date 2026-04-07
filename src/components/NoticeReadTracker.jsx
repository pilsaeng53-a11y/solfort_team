import { base44 } from "@/api/base44Client";

export default function NoticeReadTracker({ noticeId }) {
  const track = () => {
    base44.entities.NoticeReadLog.filter({ notice_id: noticeId, reader_username: JSON.parse(localStorage.getItem('sf_user')||'{}').name })
      .then(existing => {
        if (!existing.length) {
          base44.entities.NoticeReadLog.create({
            notice_id: noticeId,
            reader_name: JSON.parse(localStorage.getItem('sf_user')||'{}').name,
            reader_username: JSON.parse(localStorage.getItem('sf_user')||'{}').name,
            reader_role: JSON.parse(localStorage.getItem('sf_user')||'{}').role,
            read_at: new Date().toISOString(),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  };

  return <div onClick={track} style={{ display: "none" }} />;
}