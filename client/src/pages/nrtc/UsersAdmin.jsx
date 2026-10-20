import { useCallback, useEffect, useState } from "react";
import api, { errorText } from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, EmptyState } from "../../components/ui.jsx";
import { ROLES, PRODUCTION_SECTIONS } from "../../utils.js";

export default function NrtcUsers() {
  const [dept, setDept] = useState("");
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "", section: "" });
  const [msg, setMsg] = useState({ text: "", kind: "info" });
  const [resetFor, setResetFor] = useState(null);
  const [resetPw, setResetPw] = useState("");

  const load = useCallback(() => {
    api.get("/nrtc/admin/users", { params: dept ? { dept } : {} }).then(({ data }) => setRows(data));
  }, [dept]);
  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function addUser(e) {
    e.preventDefault();
    setMsg({ text: "", kind: "info" });
    try {
      const payload = { ...form };
      if (payload.role !== "production") payload.section = "";
      await api.post("/nrtc/admin/users", payload);
      setForm({ username: "", password: "", full_name: "", role: "", section: "" });
      setMsg({ text: "User created. They will be asked to change password on first sign in.", kind: "success" });
      load();
    } catch (err) {
      setMsg({ text: errorText(err), kind: "error" });
    }
  }

  async function toggle(u) {
    try {
      await api.post(`/nrtc/admin/users/${u.id}/toggle`);
      load();
    } catch (err) {
      setMsg({ text: errorText(err), kind: "error" });
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    try {
      await api.post(`/nrtc/admin/users/${resetFor.id}/reset`, { password: resetPw });
      setResetFor(null);
      setResetPw("");
      setMsg({ text: "Password reset. The user must change it on next sign in.", kind: "success" });
    } catch (err) {
      setMsg({ text: errorText(err), kind: "error" });
    }
  }

  return (
    <>
      <PageHead breadcrumb="Administration / Users" title="User Management" sub={`${rows.length} account(s)`} />
      <div className="grid-2">
        <Panel
          title="Department Users"
          icon="users"
          right={
            <div className="flex gap-1 flex-wrap">
              <button className={`btn btn-sm ${!dept ? "btn-primary" : "btn-outline"}`} onClick={() => setDept("")}>All</button>
              {Object.keys(ROLES).map((r) => (
                <button className={`btn btn-sm ${dept === r ? "btn-primary" : "btn-outline"}`} onClick={() => setDept(r)} key={r}>
                  {ROLES[r].replace(" Department", "").replace(" (NRTC)", "")}
                </button>
              ))}
            </div>
          }
          bodyClass="flush"
        >
          <div className="table-wrap">
            <table className="gov-table">
              <thead>
                <tr><th>Name</th><th>Username</th><th>Department</th><th>Section</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-bold">{u.full_name}</td>
                    <td>{u.username}</td>
                    <td><span className="pill">{u.role_label}</span></td>
                    <td>{u.section_label || "—"}</td>
                    <td>
                      <span className={`badge ${u.is_active ? "green" : "gray"}`}>{u.is_active ? "Active" : "Disabled"}</span>
                      {u.must_change_password && <div className="small text-muted">Must change password</div>}
                    </td>
                    <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setResetFor(u)} title="Reset password">
                        <Icon name="lock" />
                      </button>
                      <button className="btn btn-ghost btn-xs" style={{ color: u.is_active ? "#B91C1C" : "#16A34A" }} onClick={() => toggle(u)} title={u.is_active ? "Disable" : "Enable"}>
                        <Icon name={u.is_active ? "x" : "check"} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan="6"><EmptyState title="No users found" icon="users" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Add New User" icon="plus" style={{ borderLeft: "4px solid var(--gov-gold)" }}>
          {msg.text && (
            <div className={`alert ${msg.kind} mb-2`}>
              <Icon name={msg.kind === "error" ? "alert" : "check-circle"} />
              <span>{msg.text}</span>
            </div>
          )}
          <form onSubmit={addUser}>
            <div className="field">
              <label>Full Name</label>
              <input type="text" value={form.full_name} onChange={set("full_name")} required />
            </div>
            <div className="field">
              <label>Username</label>
              <input type="text" value={form.username} onChange={set("username")} required />
            </div>
            <div className="field">
              <label>Temporary Password</label>
              <input type="text" value={form.password} onChange={set("password")} required minLength={6} />
              <div className="hint">User will be asked to change it on first sign in.</div>
            </div>
            <div className="field">
              <label>Department Role</label>
              <select value={form.role} onChange={set("role")} required>
                <option value="">— Select department —</option>
                {Object.entries(ROLES).map(([key, label]) => (
                  <option value={key} key={key}>{label}</option>
                ))}
              </select>
            </div>
            {form.role === "production" && (
              <div className="field">
                <label>Production II Section</label>
                <select value={form.section} onChange={set("section")} required>
                  <option value="">— Select section (officer = no section) —</option>
                  {PRODUCTION_SECTIONS.map(([key, label]) => (
                    <option value={key} key={key}>{label}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn btn-primary">
              <Icon name="plus" cls="btn-icon" /> Create User
            </button>
          </form>
        </Panel>
      </div>

      {resetFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="panel" style={{ width: 420, maxWidth: "90vw" }}>
            <div className="panel-head"><h3>Reset Password — {resetFor.full_name}</h3></div>
            <div className="panel-body">
              <form onSubmit={resetPassword}>
                <div className="field">
                  <label>New Temporary Password</label>
                  <input type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} required minLength={6} autoFocus />
                </div>
                <div className="flex gap-1">
                  <button className="btn btn-primary" type="submit"><Icon name="lock" cls="btn-icon" /> Reset</button>
                  <button className="btn btn-outline" type="button" onClick={() => setResetFor(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
