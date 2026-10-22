import { NavLink, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  LayoutDashboard,
  FileText,
  BookOpen,
  UserRound,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", path: "/documents", icon: FileText },
  { label: "Flashcards", path: "/flashcards", icon: BookOpen },
  { label: "Profile", path: "/profile", icon: UserRound },
];

function Sidebar({ mobileOpen = false, onClose }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    signOut();
    onClose?.();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col border-r border-[#eceef1] bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#eceef1] px-[18px]">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className="flex min-w-0 items-center gap-[14px]"
          >
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#05c4a0] to-[#06b99f] text-white shadow-[0_5px_12px_rgba(0,185,153,0.24)]">
              <BrainCircuit size={25} strokeWidth={2.3} />
            </span>
            <span className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.045em] text-[#171d2b]">
              AI Learning Assistant
            </span>
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="space-y-[7px] px-[8px] pt-[29px]">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex h-[48px] items-center gap-[14px] rounded-[14px] px-[18px] text-[15px] font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-r from-[#09bd9a] to-[#02b8a5] text-white shadow-[0_7px_14px_rgba(0,185,153,0.2)]"
                      : "text-[#303949] hover:bg-[#f7f9fa]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={21} strokeWidth={isActive ? 2.2 : 2} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#eceef1] px-[18px] py-[17px]">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-[32px] w-full items-center gap-[14px] rounded-lg text-[15px] font-medium text-[#303949] transition hover:text-[#0b9d87]"
          >
            <LogOut size={21} strokeWidth={2} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
