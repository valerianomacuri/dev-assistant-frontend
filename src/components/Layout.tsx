import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
  }`;

export function Layout({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">
              🤖 Dev Assistant
            </span>
            <nav className="ml-4 flex gap-1">
              <NavLink to="/chat" className={navClass}>
                Chat
              </NavLink>
              <NavLink to="/knowledge" className={navClass}>
                Conocimiento
              </NavLink>
              <NavLink to="/stats" className={navClass}>
                Estadísticas
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden text-sm text-slate-500 sm:inline">
                {email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-4">
        {children}
      </main>
    </div>
  );
}
