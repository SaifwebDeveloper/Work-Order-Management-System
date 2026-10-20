import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, ROLE_HOME } from "../auth.jsx";
import { errorText } from "../api.js";
import Icon from "../components/Icon.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(username.trim(), password);
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
          <h1>NRTC — Repair &amp; Maintenance</h1>
          <p>Ministry of Defence Production — Government of Pakistan</p>
        </div>
        {error && (
          <div className="alert error">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            <Icon name="log-out" cls="btn-icon" /> {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div className="auth-foot">
          No account? <Link to="/signup">Request registration</Link>
        </div>
        <div className="auth-demo">
          <b>Demo accounts</b> — admin/admin123 · p3c/p3c123 · prod.officer/prod123 · prod.emp/prod123 · finance/finance123
        </div>
      </div>
    </div>
  );
}
