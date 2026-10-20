import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorText } from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel } from "../../components/ui.jsx";

export default function NrtcImport() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("Please choose an .xlsx file to import.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/nrtc/inventory/import", fd);
      setResult(data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        breadcrumb={<><Link to="/nrtc">Dashboard</Link> / <Link to="/nrtc/inventory">Inventory</Link> / Import</>}
        title="Import Item Rates from Excel"
        sub="Upload a workbook with Description, Store Code and Unit Price columns"
      />
      <div className="grid-2">
        <Panel title="Upload Workbook" icon="upload">
          {error && (
            <div className="alert error mb-2"><Icon name="alert" /><span>{error}</span></div>
          )}
          <form onSubmit={submit}>
            <div className="file-drop" onClick={() => ref.current?.click()}>
              <input
                ref={ref}
                type="file"
                accept=".xlsx"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              <div className="fd-icon"><Icon name="upload" /></div>
              <div className="fd-text">{file ? file.name : "Click to choose the .xlsx workbook"}</div>
              <div className="fd-hint">Store Code and Description columns are required; Unit Price optional (defaults to 0)</div>
            </div>
            <button className="btn btn-primary mt-2" disabled={busy}>
              <Icon name="check-circle" cls="btn-icon" /> {busy ? "Importing…" : "Import / Update Items"}
            </button>
          </form>
        </Panel>

        <div>
          <Panel title="Import Format" icon="file">
            <p className="help-text mb-2">
              The first row matching <b>Description</b> + <b>Store Code</b> headers is treated as the header row.
              Existing store codes are updated; new ones are inserted.
            </p>
            <a className="btn btn-outline btn-sm" href="/api/nrtc/inventory/sample.xlsx">
              <Icon name="download" cls="btn-icon" /> Download Sample Workbook
            </a>
          </Panel>

          {result && (
            <Panel title="Import Result" icon="check-circle">
              <div className="detail-grid cols-2">
                <div className="dg-item"><div className="dg-label">New items inserted</div><div className="dg-value">{result.inserted}</div></div>
                <div className="dg-item"><div className="dg-label">Existing items updated</div><div className="dg-value">{result.updated}</div></div>
              </div>
              {result.errors?.length > 0 && (
                <>
                  <hr className="divider-gold" />
                  <div className="dg-label mb-1">Warnings</div>
                  {result.errors.map((e2, i) => (
                    <div className="alert info" style={{ padding: "7px 12px", marginBottom: 6 }} key={i}>
                      <Icon name="info" /><span className="small">{e2}</span>
                    </div>
                  ))}
                </>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
