import { useEffect, useState } from "react";
import api, { errorText } from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel } from "../../components/ui.jsx";

export default function NrtcSettings() {
  const [settings, setSettings] = useState({});
  const [msg, setMsg] = useState({ text: "", kind: "info" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/nrtc/settings").then(({ data }) => setSettings(data.settings));
  }, []);

  const set = (k) => (e) => setSettings((s) => ({ ...s, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ text: "", kind: "info" });
    try {
      const { data } = await api.post("/nrtc/settings", settings);
      setSettings(data.settings);
      setMsg({ text: "Settings saved.", kind: "success" });
    } catch (err) {
      setMsg({ text: errorText(err), kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, hint) => (
    <div className="field">
      <label>{label}</label>
      <input type="text" value={settings[key] ?? ""} onChange={set(key)} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );

  return (
    <>
      <PageHead breadcrumb="Administration / Settings" title="System Settings" sub="Organisation identity, financial defaults and document authorities" />
      <form onSubmit={save}>
        <div className="grid-halves">
          <Panel title="Organisation Identity" icon="building">
            {msg.text && (
              <div className={`alert ${msg.kind} mb-2`}>
                <Icon name={msg.kind === "error" ? "alert" : "check-circle"} />
                <span>{msg.text}</span>
              </div>
            )}
            {field("org_name", "Organisation Full Name")}
            {field("org_short", "Short Name", "Used in headers, e.g. NRTC")}
            {field("dept_name", "Department Name")}
            {field("tagline", "Tagline / Ministry Line")}
            {field("org_address", "Address")}
            <div className="form-grid cols-2">
              {field("org_phone", "Phone")}
              {field("org_email", "Email")}
              {field("org_website", "Website")}
            </div>
          </Panel>

          <div>
            <Panel title="Financial Settings" icon="rupee">
              <div className="form-grid cols-2">
                {field("currency", "Currency Label")}
                {field("wo_start", "Work Order Number Start", "Next work order number starts from MAX(latest, this) + 1")}
                {field("gst_component", "GST on Components (%)")}
                {field("gst_labour", "GST on Labour (%)")}
                {field("gp_prefix", "Gate Pass Prefix", "e.g. GP → GP-2026-0001")}
              </div>
            </Panel>

            <Panel title="Document Settings" icon="file">
              {field("sign_authority", "Signing Authority", "Shown on work order and gate pass signature blocks")}
              {field("issuing_authority", "Issuing Authority", "Shown on gate pass documents")}
              {field("footer_note", "Document Footer Note")}
            </Panel>

            <button className="btn btn-primary" disabled={busy}>
              <Icon name="save" cls="btn-icon" /> {busy ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
