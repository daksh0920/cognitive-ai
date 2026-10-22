import { Bell, Menu, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const username = user?.username || user?.name || "Learner";
  const email = user?.email || "";

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#eceef1] bg-white px-4 sm:px-6 lg:px-[28px]">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="ml-auto flex h-full items-center">
        <div className="relative flex h-full items-center border-r border-[#eceef1] pr-[22px]">
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="relative rounded-xl p-[9px] text-[#606979] transition hover:bg-slate-50"
          >
            <Bell size={22} strokeWidth={1.8} />
            <span className="absolute right-[7px] top-[6px] h-[9px] w-[9px] rounded-full border border-white bg-[#0ab99b]" />
          </button>
        </div>

        <Link to="/profile" className="flex items-center gap-[12px] pl-[22px]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-gradient-to-br from-[#05c4a0] to-[#06b99f] text-white shadow-[0_5px_12px_rgba(0,185,153,0.2)]">
            <UserRound size={22} strokeWidth={2.2} />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-[180px] truncate text-[15px] font-semibold leading-5 text-[#1b2230]">
              {username}
            </span>
            <span className="block max-w-[210px] truncate text-[13px] leading-5 text-[#778191]">
              {email}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}

export default Topbar;
