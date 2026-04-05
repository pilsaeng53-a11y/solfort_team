import { Outlet } from "react-router-dom";

export default function CallLayout() {
  return (
    <div className="min-h-screen bg-[#080a12]">
      <Outlet />
    </div>
  );
}