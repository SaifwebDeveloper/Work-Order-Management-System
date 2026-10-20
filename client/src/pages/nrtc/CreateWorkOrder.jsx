import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { errorText } from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, FileDrop } from "../../components/ui.jsx";
import { todayStr } from "../../utils.js";

export default function NrtcCreateWorkOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    wo_date: todayStr(),
    customer_name: "",
    customer_tag: "",
    reference_number: "",
    contract_number: "",
    under_warranty: false,
  });
  const [equipment, setEquipment] = useState([{ name: "", serial: "", defect: "" }]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const setEq = (i, k) => (e) =>
    setEquipment((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: e.target.value } : r)));

  function addRow() {
    setEquipment((rows) => [...rows, { name: "", serial: "", defect: "" }]);
  }
  function removeRow(i) {
    setEquipment((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));
  }

  async function submit(action) {
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ? (v === true ? "1" : String(v)) : ""));
      equipment.forEach((eq) => {
        fd.append("eq_name", eq.name);
        fd.append("eq_serial", eq.serial);
        fd.append("eq_defect", eq.defect);
      });
      files.forEach((f) => fd.append("attachments", f));
      fd.append("action", action);
      const { data } = await api.post("/nrtc/work-orders", fd);
      navigate(`/nrtc/work-orders/${data.id}`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        breadcrumb={<><Link to="/nrtc">Dashboard</Link> / Create</>}
        title="Create Work Order"
        sub="The work order number is assigned automatically on save"
      />
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit("forward");
        }}
      >
        <div className="grid-2">
          <Panel title="Work Order Information" icon="file">
            <div className="form-grid cols-2">
              <div className="field">
                <label>Work Order No.</label>
                <input type="text" value="Auto — assigned on save" readOnly className="locked" />
              </div>
              <div className="field">
                <label>Work Order Date <span className="req">*</span></label>
                <input type="date" value={form.wo_date} onChange={set("wo_date")} required />
              </div>
              <div className="field span-2">
                <label>Customer / Formation <span className="req">*</span></label>
                <input type="text" value={form.customer_name} onChange={set("customer_name")} placeholder="e.g. Pakistan Army — 10 Corps (Kharian)" required />
              </div>
              <div className="field">
                <label>Customer Tag / Unit</label>
                <input type="text" value={form.customer_tag} onChange={set("customer_tag")} placeholder="e.g. 2nd Signal Bn" />
              </div>
              <div className="field">
                <label>Reference Number</label>
                <input type="text" value={form.reference_number} onChange={set("reference_number")} placeholder="e.g. GHQ/1234/2026" />
              </div>
              <div className="field">
                <label>Contract Number</label>
                <input type="text" value={form.contract_number} onChange={set("contract_number")} placeholder="e.g. NRTC/CT/2019/041" />
              </div>
              <div className="field">
                <label>Warranty</label>
                <label className="checkbox-row" style={{ display: "flex", gap: 8, alignItems: "center", height: 38 }}>
                  <input type="checkbox" checked={form.under_warranty} onChange={set("under_warranty")} /> Under Warranty
                </label>
              </div>
            </div>
          </Panel>

          <Panel title="Equipment Under Repair" icon="box">
            <div id="equipment-list">
              {equipment.map((eq, i) => (
                <div className="equip-row" key={i}>
                  <span className="eq-seq">{i + 1}</span>
                  <input type="text" placeholder="Equipment name / nomenclature" value={eq.name} onChange={setEq(i, "name")} required />
                  <input type="text" placeholder="Serial number (optional)" value={eq.serial} onChange={setEq(i, "serial")} />
                  <input type="text" placeholder="Reported defect / nature of fault" value={eq.defect} onChange={setEq(i, "defect")} />
                  <button type="button" className="btn btn-ghost btn-xs btn-remove" onClick={() => removeRow(i)} disabled={equipment.length === 1} title="Remove">
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm mt-2" id="add-equipment" onClick={addRow}>
              <Icon name="plus" cls="btn-icon" /> Add Equipment
            </button>
          </Panel>
        </div>

        <Panel title="Attachments" icon="upload">
          <div className="file-drop" onClick={() => fileRef.current?.click()}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
              multiple
              style={{ display: "none" }}
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <div className="fd-icon"><Icon name="upload" /></div>
            <div className="fd-text">Click to attach work order scan / authorization files</div>
            <div className="fd-files">
              {files.map((f) => (
                <span className="pill" key={f.name}>{f.name}</span>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => submit("save")}>
              <Icon name="save" cls="btn-icon" /> Save as Draft
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Icon name="send" cls="btn-icon" /> {busy ? "Saving…" : "Save & Forward to P3&C"}
            </button>
            <span className="help-text ml-auto">A unique work order number (from 1300 upwards) is assigned on save and shown in red on all documents.</span>
          </div>
        </Panel>
      </form>
    </>
  );
}
