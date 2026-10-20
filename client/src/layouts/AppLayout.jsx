import { useEffect, useRef, useState, useCallback } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import api from "../api.js";
import { useAuth, ROLE_HOME } from "../auth.jsx";
import Icon from "../components/Icon.jsx";
import { Flash, useFlashes } from "../components/ui.jsx";
import { fmtDateTime } from "../utils.js";

const ROLE_SHORT = {
  nrtc_admin: "R&M Department",
  p3c: "P3 & C Department",
  production: "Production II",
  finance: "Finance Department",
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { flashes, push, dismiss } = useFlashes();
  const [settings, setSettings] = useState({ org_short: "NRTC", dept_name: "Repair & Maintenance Department", tagline: "", org_website: "", org_phone: "", org_address: "" });
  const [notifs, setNotifs] = useState({ unread: 0, items: [] });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const notifRef = useRef(null);

  const loadNotifs = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifs(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 30000);
    return () => clearInterval(t);
  }, [loadNotifs]);

  useEffect(() => {
    api
      .get("/settings")
      .then(({ data }) => setSettings((s) => ({ ...s, ...data.settings })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function markAllRead(e) {
    e.stopPropagation();
    await api.post("/notifications/read-all");
    loadNotifs();
  }

  function doLogout() {
    logout();
    navigate("/login");
  }

  function submitSearch(e) {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  }

  const navLink = (to, icon, label, extra) => (
    <NavLink to={to} className={({ isActive }) => (isActive ? "active" : "")} end={to.split("/").length <= 2}>
      <Icon name={icon} cls="snav-icon" /> {label}
      {extra}
    </NavLink>
  );

  return (
    <>
      <div className="gov-strip no-print">
        <div className="strip-left">
          <img src="/img/Nrtc_logo.png" alt="" className="strip-emblem" />
          <span>{settings.tagline}</span>
        </div>
        <div className="strip-right">
          <span>{settings.org_website}</span>
          <span>{settings.org_phone}</span>
        </div>
      </div>

      <header className="navbar no-print">
        <Link className="navbar-brand" to={ROLE_HOME[user.role]}>
          <img src="/img/Nrtc_logo.png" alt="NRTC" />
          <span className="brand-text">
            <span className="brand-title">{settings.org_short}</span>
            <br />
            <span className="brand-sub">{settings.dept_name}</span>
          </span>
        </Link>

        <form className="navbar-search" onSubmit={submitSearch}>
          <span className="search-icon">
            <Icon name="search" />
          </span>
          <input
            type="text"
            placeholder="Search work orders, customers, serial numbers…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </form>

        <div className="navbar-right">
          <button
            className="nav-icon-btn"
            title="Notifications"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === "notif" ? null : "notif");
            }}
          >
            <Icon name="bell" />
            {notifs.unread > 0 && <span className="nav-badge">{notifs.unread < 100 ? notifs.unread : "99+"}</span>}
          </button>
          <div className={`dropdown ${openDropdown === "notif" ? "open" : ""}`} style={{ width: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-header">
              <span>Notifications</span>
              {notifs.unread > 0 && (
                <button type="button" className="btn btn-ghost btn-xs" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="dropdown-list" style={{ maxHeight: 340, overflowY: "auto" }}>
              {notifs.items.slice(0, 8).map((n) => (
                <Link className={`dropdown-item ${n.is_read ? "" : "unread"}`} to={n.link || "/notifications"} key={n._id}>
                  <div className="di-title">{n.title}</div>
                  <div className="di-msg">{n.message}</div>
                  <div className="di-time">{n.created_at}</div>
                </Link>
              ))}
              {!notifs.items.length && <div className="dropdown-empty">No notifications yet.</div>}
            </div>
            <div className="dropdown-divider"></div>
            <Link className="dropdown-item menu" to="/notifications">
              View all notifications
            </Link>
          </div>

          <div className="nav-user">
            <button
              className="nav-user-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(openDropdown === "user" ? null : "user");
              }}
            >
              <span className="avatar">{(user.full_name || "?").slice(0, 1).toUpperCase()}</span>
              <span className="user-meta">
                <span className="user-name">{user.full_name}</span>
                <br />
                <span className="user-role">{ROLE_SHORT[user.role]}</span>
              </span>
              <Icon name="chevron-down" />
            </button>
            <div className={`dropdown ${openDropdown === "user" ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-header">
                <span>{ROLE_SHORT[user.role]}</span>
              </div>
              <Link className="dropdown-item menu" to="/profile">
                <Icon name="user" /> My Profile
              </Link>
              <Link className="dropdown-item menu" to="/profile#password">
                <Icon name="lock" /> Change Password
              </Link>
              <div className="dropdown-sep"></div>
              <button type="button" className="dropdown-item menu danger" onClick={doLogout} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <Icon name="log-out" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <img src="/img/Nrtc_logo.png" alt="NRTC" />
          <div>
            <div className="sb-name">NRTC</div>
            <div className="sb-dept">{settings.dept_name}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {user.role === "nrtc_admin" && (
            <>
              <div className="sidebar-section-label">Repair &amp; Maintenance</div>
              {navLink("/nrtc", "dashboard", "Dashboard")}
              {navLink("/nrtc/create", "plus", "Create Work Order")}
              {navLink("/nrtc/work-orders", "clipboard", "Work Orders")}
              {navLink("/gatepasses", "truck", "Gate Passes")}
              <div className="sidebar-section-label">Item Master</div>
              {navLink("/nrtc/inventory", "box", "Inventory")}
              {navLink("/nrtc/inventory/import", "upload", "Import Excel")}
              <div className="sidebar-section-label">Administration</div>
              {navLink("/nrtc/users", "users", "Users")}
              {navLink("/nrtc/settings", "settings", "System Settings")}
            </>
          )}
          {user.role === "p3c" && (
            <>
              <div className="sidebar-section-label">P3 &amp; C Department</div>
              {navLink("/p3c", "dashboard", "Dashboard")}
              {navLink("/p3c/work-orders", "clipboard", "Work Orders")}
              {navLink("/users", "users", "Users")}
            </>
          )}
          {user.role === "production" && (
            <>
              <div className="sidebar-section-label">Production II</div>
              {navLink("/production", "dashboard", "Dashboard")}
              {navLink("/production/work-orders", "clipboard", "Work Orders")}
              <div className="sn-group">
                <NavLink to="/production/sections" className={({ isActive }) => (isActive ? "active" : "")}>
                  <Icon name="layers" cls="snav-icon" /> Sections <Icon name="chevron-right" cls="snav-icon snav-caret" />
                </NavLink>
                <div className="sn-submenu">
                  {PRODUCTION_SECTION_LINKS()}
                </div>
              </div>
              {navLink("/users", "users", "Users")}
            </>
          )}
          {user.role === "finance" && (
            <>
              <div className="sidebar-section-label">Finance Department</div>
              {navLink("/finance", "dashboard", "Dashboard")}
              {navLink("/finance/work-orders", "rupee", "Costing Queue")}
              {navLink("/gatepasses", "truck", "Gate Passes")}
              {navLink("/users", "users", "Users")}
            </>
          )}

          <div className="sidebar-section-label">General</div>
          <NavLink to="/notifications" className={({ isActive }) => (isActive ? "active" : "")}>
            <Icon name="bell" cls="snav-icon" /> Notifications
            {notifs.unread > 0 && <span className="snav-badge">{notifs.unread}</span>}
          </NavLink>
          {navLink("/profile", "user", "My Profile")}
        </nav>

        <div className="sidebar-footer">
          {settings.org_address}
          <br />© {new Date().getFullYear()} {settings.org_short} — All rights reserved
        </div>
      </aside>

      <main className="main">
        <Flash flashes={flashes} dismiss={dismiss} />
        <Outlet context={{ pushFlash: push }} />
      </main>
    </>
  );
}

import { PRODUCTION_SECTIONS } from "../utils.js";
function PRODUCTION_SECTION_LINKS() {
  return PRODUCTION_SECTIONS.map(([key, label]) => (
    <NavLink to={`/production/sections/${key}`} key={key}>
      <Icon name="box" cls="snav-icon" /> {label}
    </NavLink>
  ));
}

export { fmtDateTime };
