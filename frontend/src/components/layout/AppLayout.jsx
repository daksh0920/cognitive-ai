import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171d2b]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-h-screen lg:pl-[292px]">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="w-full p-5 sm:p-6 lg:px-[28px] lg:py-[30px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
