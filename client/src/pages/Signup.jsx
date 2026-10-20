import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, ROLE_HOME } from "../auth.jsx";
import { errorText } from "../api.js";
import Icon from "../components/Icon.jsx";
import { ROLES, PRODUCTION_SECTIONS, SECTION_LABELS } from "../utils.js";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "", section: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = { ...form };
      if (payload.role !== "production") payload.section = "";
      const user = await signup(payload);
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <img src="/img/Nrtc_logo.png" alt="NRTC" className="auth-logo" />
          <h1>Account Registration</h1>
          <p>Select your department to request system access</p>
        </div>
        {error && (
          <div className="alert error">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label>Full Name</label>
            <input type="text" value={form.full_name} onChange={set("full_name")} required />
          </div>
          <div className="field">
            <label>Username</label>
            <input type="text" value={form.username} onChange={set("username")} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set("password")} required minLength={6} />
          </div>
          <div className="field">
            <label>Department Role</label>
            <select value={form.role} onChange={set("role")} required>
              <option value="">— Select department —</option>
              {Object.entries(ROLES).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {form.role === "production" && (
            <div className="field">
              <label>Production II Section</label>
              <select value={form.section} onChange={set("section")} required>
                <option value="">— Select section —</option>
                {PRODUCTION_SECTIONS.map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="hint">Officers (no section) see rates; technicians do not.</div>
            </div>
          )}
          <button className="btn btn-primary btn-block" disabled={busy}>
            <Icon name="check-circle" cls="btn-icon" /> {busy ? "Creating account…" : "Create Account"}
          </button>
        </form>
        <div className="auth-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export { SECTION_LABELS };
