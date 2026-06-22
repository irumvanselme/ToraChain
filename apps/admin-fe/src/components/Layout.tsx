import { Link, Outlet } from "react-router-dom";
import { Button, Container, LogoText } from "@tora-chain/ui-components";
import { useAuth } from "@tora-chain/fe-common";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <header className="navbar border-b border-base-300 bg-base-100 px-4">
        <Container className={"flex"}>
          <div className="flex-1 items-center gap-6">
            <Link to="/elections" className="text-xl font-bold text-primary">
              <LogoText />
            </Link>
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
        </Container>
      </header>

      <main>
        <Container>
          <Outlet />
        </Container>
      </main>
    </div>
  );
}
