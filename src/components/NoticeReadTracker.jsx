import { base44 } from "@/api/base44Client";
import { Auth } from "@/lib/auth";

export default function NoticeReadTracker({ noticeId }) {
  const track = () => {
    base44.entities.NoticeReadLog.filter({ notice_id: noticeId, reader_username: Auth.getDealerName() })
      .then(existing => {
        if (!existing.length) {
          base44.entities.NoticeReadLog.create({
            notice_id: noticeId,
            reader_name: Auth.getDealerName(),
            reader_username: Auth.getDealerName(),
            reader_role: Auth.getRole(),
            read_at: new Date().toISOString(),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  };

  return <div onClick={track} style={{ display: "none" }} />;
}