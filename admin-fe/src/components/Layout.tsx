import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@tora-chain/ui-components";
import { useAuth } from "@tora-chain/fe-common";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <header className="navbar border-b border-base-300 bg-base-100 px-4">
        <div className="flex-1 items-center gap-6">
          <Link to="/elections" className="text-xl font-bold text-primary">
            ToraChain
          </Link>
          <nav className="hidden gap-1 sm:flex">
            <NavLink
              to="/elections"
              className={({ isActive }) =>
                `btn btn-ghost btn-sm ${isActive ? "btn-active" : ""}`
              }
            >
              Elections
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-base-content/70 sm:inline">
              {user.name || user.email}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
