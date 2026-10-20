import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api, { openFile } from "../../api";
import { fmtQty } from "../../utils";
import Icon from "../../components/Icon";
import { EmptyState, PageHead, Panel } from "../../components/ui";

export default function GatepassNew() {
  const { woId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    issued_to: "", designation: "", basis_through: "", vehicle_no: "",
    returnable: "1", expected_return_date: "", remarks: "",
  });
  const [qty, setQty] = useState({});
  const [file, setFile] = useState(null);

  useEffect(() => {
    api.get(`/gatepass/new/${woId}`).then((r) => {
      setData(r.data);
      const init = {};
      for (const d of r.data.delivery || []) init[d.id] = String(Math.round(d.remaining * 100) / 100).replace(/\.0+$/, "");
      setQty(init);
    }).catch((e) => setErr(e.response?.data?.error || e.message));
  }, [woId]);

  if (err && !data) return <div className="alert error"><Icon name="alert" /><span>{err}</span></div>;
  if (!data) return <div className="empty-state"><div className="es-sub">Loading…</div></div>;

  const { wo, delivery, wo_attachments } = data;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) fd.append(k, v);
      for (const [eqId, v] of Object.entries(qty)) fd.append(`qty_${eqId}`, v);
      if (file) fd.append("attachment", file);
      const res = await api.post(`/gatepass/new/${woId}`, fd);
      navigate(`/gatepasses/${res.data.id}`);
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead breadcrumb={<span><Link to={`/nrtc/work-orders/${woId}`}>Work Order {wo.wo_number}</Link> / Issue Gate Pass</span>}
        title={<span>Issue Gate Pass (Material) — W.O. <span className="text-red">#{wo.wo_number}</span></span>}
        sub={`${wo.customer_name} · Optional equipment-wise issuance — partial delivery is fully supported`}
        actions={<Link className="btn btn-outline" to={`/nrtc/work-orders/${woId}`}><Icon name="arrow-left" cls="btn-icon" /> Back to Work Order</Link>} />

      {!delivery?.length && (
        <div className="alert info mb-2"><Icon name="check-circle" />
          <span>All equipment of this work order has been fully delivered. No further gate pass is required.</span></div>
      )}
      {err && <div className="alert error"><Icon name="alert" /><span>{err}</span></div>}

      <form onSubmit={submit}>
        <div className="grid-2">
          <div>
            <Panel title="Section A — Recipient / Movement Information" icon="user">
              <div className="form-grid cols-2">
                <div className="field">
                  <label>Issued To (Mr/Ms) <span className="req">*</span></label>
                  <input type="text" required value={form.issued_to} onChange={set("issued_to")} placeholder="e.g. Mr. Muhammad Rizwan" />
                </div>
                <div className="field">
                  <label>Designation</label>
                  <input type="text" value={form.designation} onChange={set("designation")} placeholder="e.g. Subedar / Store Incharge" />
                </div>
                <div className="field">
                  <label>Basis / Through</label>
                  <input type="text" value={form.basis_through} onChange={set("basis_through")} placeholder="e.g. Through TPT Section / Gate No. 2" />
                </div>
                <div className="field">
                  <label>Vehicle No. <span className="req">*</span></label>
                  <input type="text" required value={form.vehicle_no} onChange={set("vehicle_no")} placeholder="e.g. LES-4471 / Military No. 45-88231" />
                </div>
                <div className="field">
                  <label>Work Order No.</label>
                  <input type="text" value={wo.wo_number} readOnly className="locked" />
                </div>
                <div className="field">
                  <label>Pass Type <span className="req">*</span></label>
                  <div className="radio-row">
                    <label><input type="radio" name="returnable" value="1" checked={form.returnable === "1"} onChange={set("returnable")} /> Returnable</label>
                    <label><input type="radio" name="returnable" value="0" checked={form.returnable === "0"} onChange={set("returnable")} /> Non-Returnable</label>
                  </div>
                </div>
                <div className="field">
                  <label>Expected Return Date (if returnable)</label>
                  <input type="date" value={form.expected_return_date} onChange={set("expected_return_date")} />
                </div>
                <div className="field">
                  <label>Remarks</label>
                  <input type="text" value={form.remarks} onChange={set("remarks")} placeholder="Any special instructions…" />
                </div>
                <div className="field span-2">
                  <label>Attach Work Order / Reference File</label>
                  <div className="file-drop" onClick={() => document.getElementById("gp-file")?.click()}>
                    <input id="gp-file" type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }}
                      onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <div className="fd-icon"><Icon name="upload" /></div>
                    <div className="fd-text">{file ? file.name : "Attach the work order copy / authorization file"}</div>
                    <div className="fd-hint">The related work order document is attached with every gate pass</div>
                  </div>
                </div>
              </div>
              {wo_attachments?.length > 0 && (
                <p className="help-text mt-2">
                  Already on file for this work order:{" "}
                  {wo_attachments.map((a, i) => (
                    <span key={a._id}>
                      <a style={{ cursor: "pointer" }} onClick={() => openFile(`/files/${a._id}`)}>{a.original_name}</a>
                      {i < wo_attachments.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              )}
            </Panel>
          </div>

          <div>
            <Panel title="Section B — Material / Equipment Selection" icon="box" bodyClass="flush">
              <div className="table-wrap">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}></th>
                      <th>Description</th>
                      <th>Serial Number</th>
                      <th className="center">Total</th>
                      <th className="center">Delivered</th>
                      <th className="center">Remaining</th>
                      <th style={{ width: 110 }}>Deliver Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(delivery || []).map((eq) => (
                      <tr key={eq.id}>
                        <td className="center">
                          <input type="checkbox" checked disabled style={{ pointerEvents: "none", opacity: .5 }} />
                        </td>
                        <td><span className="fw-bold">{eq.name}</span></td>
                        <td>{eq.serial_number || "—"}</td>
                        <td className="center">{fmtQty(eq.quantity)} {eq.unit}</td>
                        <td className="center">{fmtQty(eq.delivered)}</td>
                        <td className="center">
                          <span className={`badge ${eq.remaining > 0 ? "amber" : "green"}`}>{fmtQty(eq.remaining)}</span>
                        </td>
                        <td>
                          <input type="number" step="0.01" min="0" max={eq.remaining} value={qty[eq.id] ?? ""}
                            onChange={(e) => setQty((q) => ({ ...q, [eq.id]: e.target.value }))}
                            style={{ height: 33, border: "1px solid var(--gov-line)", borderRadius: 5, padding: "0 8px", width: "100%" }} />
                        </td>
                      </tr>
                    ))}
                    {!delivery?.length && (
                      <tr><td colSpan={7}><EmptyState title="Nothing pending" sub="All equipment has been delivered." icon="check-circle" /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="panel-body">
                <p className="help-text">Set the quantity to <b>0</b> for any equipment not yet ready — it will remain pending for a future gate pass.</p>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2 flex-wrap" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button type="submit" className="btn btn-gold" disabled={busy || !delivery?.length}>
                  <Icon name="truck" cls="btn-icon" /> Issue Gate Pass
                </button>
                <span className="help-text ml-auto">A unique gate pass number and QR verification code will be generated.</span>
              </div>
            </Panel>
          </div>
        </div>
      </form>
    </div>
  );
}
