import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { errorText } from "../api.js";
import { useAuth } from "../auth.jsx";
import Icon from "../components/Icon.jsx";
import { PageHead, Panel } from "../components/ui.jsx";
import { ROLES } from "../utils.js";

export default function Profile() {
  const { user, refresh } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [msg, setMsg] = useState({ text: "", kind: "info" });
  const [pwMsg, setPwMsg] = useState({ text: "", kind: "info" });

  useEffect(() => {
    setForm({ full_name: user.full_name, email: user.email || "", phone: user.phone || "" });
  }, [user]);

  useEffect(() => {
    if (location.hash === "#password") {
      document.getElementById("password-card")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k) => (e) => setPw((f) => ({ ...f, [k]: e.target.value }));

  async function saveProfile(e) {
    e.preventDefault();
    setMsg({ text: "", kind: "info" });
    try {
      await api.put("/auth/profile", form);
      await refresh();
      setMsg({ text: "Profile updated.", kind: "success" });
    } catch (err) {
      setMsg({ text: errorText(err), kind: "error" });
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg({ text: "", kind: "info" });
    if (pw.new_password !== pw.confirm) {
      setPwMsg({ text: "New passwords do not match.", kind: "error" });
      return;
    }
    try {
      await api.post("/auth/profile/password", pw);
      setPw({ current_password: "", new_password: "", confirm: "" });
      setPwMsg({ text: "Password changed successfully.", kind: "success" });
    } catch (err) {
      setPwMsg({ text: errorText(err), kind: "error" });
    }
  }

  return (
    <>
      <PageHead breadcrumb="General / Profile" title="My Profile" sub={`${ROLES[user.role]}${user.section ? " — " + user.section : ""}`} />
      <div className="grid-2">
        <Panel title="Profile Information" icon="user">
          {msg.text && (
            <div className={`alert ${msg.kind} mb-2`}>
              <Icon name={msg.kind === "error" ? "alert" : "check-circle"} />
              <span>{msg.text}</span>
            </div>
          )}
          <form onSubmit={saveProfile}>
            <div className="field">
              <label>Username</label>
              <input type="text" value={user.username} readOnly className="locked" />
            </div>
            <div className="field">
              <label>Full Name</label>
              <input type="text" value={form.full_name} onChange={set("full_name")} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="name@nrtc.gov.pk" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={set("phone")} placeholder="+92 …" />
            </div>
            <button className="btn btn-primary">
              <Icon name="save" cls="btn-icon" /> Save Profile
            </button>
          </form>
        </Panel>

        <Panel title="Change Password" icon="lock" style={{ borderLeft: "4px solid var(--gov-gold)" }}>
          <div id="password-card">
            {pwMsg.text && (
              <div className={`alert ${pwMsg.kind} mb-2`}>
                <Icon name={pwMsg.kind === "error" ? "alert" : "check-circle"} />
                <span>{pwMsg.text}</span>
              </div>
            )}
            <form onSubmit={savePassword}>
              <div className="field">
                <label>Current Password</label>
                <input type="password" value={pw.current_password} onChange={setP("current_password")} required />
              </div>
              <div className="field">
                <label>New Password</label>
                <input type="password" value={pw.new_password} onChange={setP("new_password")} required minLength={6} />
              </div>
              <div className="field">
                <label>Confirm New Password</label>
                <input type="password" value={pw.confirm} onChange={setP("confirm")} required minLength={6} />
              </div>
              <button className="btn btn-outline">
                <Icon name="lock" cls="btn-icon" /> Update Password
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </>
  );
}
