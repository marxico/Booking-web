import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { adminNavigationSections } from "../../routes/adminRoutes";
import { loadAdminSession, redirectToAdminLogin } from "../../services/adminSession";
import { AdminIcon } from "./AdminIcon";

const titleByPath = adminNavigationSections.flatMap((section) => section.items).reduce<Record<string, string>>(
  (lookup, item) => {
    lookup[item.route] = item.label;
    return lookup;
  },
  {}
);

export function AdminLayout() {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionName, setSessionName] = useState("Lawson Admin");

  const headerTitle = useMemo(() => {
    if (location.pathname.includes("/orders/")) {
      return "Order Detail";
    }

    return titleByPath[location.pathname] || "Admin Dashboard";
  }, [location.pathname]);

  const breadcrumbs = useMemo(() => {
    const items = [{ label: "Admin" }];

    if (location.pathname.includes("/performance/")) {
      items.push({ label: "Performance" });
    }

    if (location.pathname.includes("/order-invoice/")) {
      items.push({ label: "Order & Invoice" });
    }

    if (location.pathname.includes("/inventory-management/")) {
      items.push({ label: "Inventory Management" });
    }

    if (location.pathname !== "/admin") {
      items.push({ label: headerTitle });
    }

    return items;
  }, [headerTitle, location.pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/admin/logout", {
        method: "POST",
        credentials: "same-origin"
      });
    } finally {
      window.location.assign("/");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const session = await loadAdminSession();

        if (!isMounted) {
          return;
        }

        if (!session.authenticated) {
          redirectToAdminLogin();
          return;
        }

        setSessionName(session.user?.displayName || "Lawson Admin");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        redirectToAdminLogin();
        return;
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingSession) {
    return <div className="admin-state-card">Checking admin session...</div>;
  }

  return (
    <div className="admin-shell">
      <aside
        className={[
          "admin-sidebar-react",
          isSidebarCollapsed ? "is-collapsed" : "",
          isSidebarOpen ? "is-open" : ""
        ].join(" ").trim()}
      >
        <div className="admin-sidebar-react__brand">
          <div className="admin-sidebar-react__brand-mark">LM</div>
          {!isSidebarCollapsed && (
            <div>
              <strong>Lawson Admin</strong>
              <span>Operations dashboard</span>
            </div>
          )}
        </div>

        <button
          className="admin-sidebar-react__collapse"
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
        >
          {isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        </button>

        <nav className="admin-sidebar-react__nav" aria-label="Admin navigation">
          {adminNavigationSections.map((section) => (
            <div className="admin-nav-group" key={section.key}>
              {!isSidebarCollapsed && <p className="admin-nav-group__label">{section.label}</p>}
              <div className="admin-nav-group__items">
                {section.items.map((item) => (
                  <NavLink
                    key={item.route}
                    to={item.route}
                    className={({ isActive }) => `admin-nav-link ${isActive ? "is-active" : ""}`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <span className="admin-nav-link__icon">
                      <AdminIcon name={item.icon} />
                    </span>
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-shell__content">
        <header className="admin-topbar-react">
          <div className="admin-topbar-react__heading">
            <button
              className="admin-topbar-react__menu"
              type="button"
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              Menu
            </button>
            <div>
              <p className="admin-topbar-react__eyebrow">Live operations</p>
              <h1>{headerTitle}</h1>
            </div>
          </div>
          <div className="admin-topbar-react__summary">
            <span>{sessionName}</span>
            <strong>Admin session active</strong>
            <button className="admin-button" type="button" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </header>

        <div className="admin-breadcrumbs">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="admin-breadcrumbs__item">
              {index > 0 && <span className="admin-breadcrumbs__divider">/</span>}
              <span>{item.label}</span>
            </span>
          ))}
        </div>

        <main className="admin-content-react">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
