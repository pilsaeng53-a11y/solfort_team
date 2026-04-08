import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSuper from "./AdminSuper";

// 온라인디렉터 = 총관리자와 동일 권한/화면
// 단 2명 (online_dir1, online_dir2)만 해당
export default function OnlineDirector() {
  // AdminSuper와 완전히 동일한 화면 렌더링
  return <AdminSuper />;
}