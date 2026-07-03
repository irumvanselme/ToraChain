import { Link, NavLink, Outlet } from "react-router-dom";
import {
  AccountMenu,
  AppHeader,
  Container,
  LogoText,
  appNavItemClass,
} from "@tora-chain/ui-components";
import { useAuth } from "@tora-chain/fe-common";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  appNavItemClass(isActive);

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <AppHeader
        brand={
          <Link to="/elections" className="text-primary">
            <LogoText />
          </Link>
        }
        account={user && <AccountMenu user={user} onLogout={() => logout()} />}
        nav={
          <>
            <NavLink to="/elections" className={navLinkClass}>
              Elections
            </NavLink>
            <NavLink to="/users" className={navLinkClass}>
              Users
            </NavLink>
            <NavLink to="/auditors/pending-approvals" className={navLinkClass}>
              Auditor approvals
            </NavLink>
          </>
        }
      />

      <main>
        <Container>
          <Outlet />
        </Container>
      </main>
    </div>
  );
}
