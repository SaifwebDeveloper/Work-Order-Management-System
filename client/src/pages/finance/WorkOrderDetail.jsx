import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import api, { openFile } from "../../api";
import { SECTION_LABELS, fmtMoney, fmtQty, fmtDate } from "../../utils";
import Icon from "../../components/Icon";
import { EmptyState, PageHead, Panel, StatusBadge } from "../../components/ui";

export default function FinanceWorkOrderDetail() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    cost_sheet_no: "", cost_sheet_date: "", component_amount: "", labour_base: "",
    ic_costing: "", remarks: "",
  });
  const [file, setFile] = useState(null);

  const load = useCallback(() => {
    api.get(`/finance/work-orders/${id}`).then((r) => {
      const b = r.data;
      setBundle(b);
      if (b.finance) {
        setForm({
          cost_sheet_no: b.finance.cost_sheet_no || "",
          cost_sheet_date: b.finance.cost_sheet_date || b.today,
          component_amount: b.finance.component_amount ?? b.parts_total ?? "",
          labour_base: b.finance.labour_base ?? b.labour_total ?? "",
          ic_costing: b.finance.ic_costing || "",
          remarks: b.finance.remarks || "",
        });
      } else {
        setForm((f) => ({
          ...f,
          cost_sheet_date: b.today,
          component_amount: b.parts_total ?? "",
          labour_base: b.labour_total ?? "",
        }));
      }
    }).catch((e) => setErr(e.response?.data?.error || e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (err) return <div className="alert error"><Icon name="alert" /><span>{err}</span></div>;
  if (!bundle) return <div className="empty-state"><div className="es-sub">Loading…</div></div>;

  const { wo, equipment, items, labour, attachments, finance } = bundle;
  const editable = bundle.editable;
  const currency = bundle.settings?.currency || "Rs.";
  const gstC = bundle.gst_component ?? 18;
  const gstL = bundle.gst_labour ?? 15;

  const comp = parseFloat(form.component_amount) || 0;
  const lab = parseFloat(form.labour_base) || 0;
  const ic = parseFloat(form.ic_costing) || 0;
  const compGst = Math.round(comp * gstC) / 100;
  const labGst = Math.round(lab * gstL) / 100;
  const total = Math.round((comp + compGst + lab + labGst + ic) * 100) / 100;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(action) {
    if (busy) return;
    setBusy(true); setFlash(""); setErr("");
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) fd.append(k, v);
      fd.append("action", action);
      if (file) fd.append("attachments", file);
      await api.post(`/finance/work-orders/${id}/submit-cost`, fd);
      setFlash(action === "submit" ? "Cost sheet submitted to R&M for final approval." : "Draft saved.");
      setFile(null);
      load();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead
        breadcrumb={<span><Link to="/finance">Dashboard</Link> / <Link to="/finance/work-orders">Costing Queue</Link> / {wo.wo_number}</span>}
        title={<span>Cost Sheet — Work Order <span className="text-red">#{wo.wo_number}</span></span>}
        sub={`${wo.customer_name} · Verified by R&M · ${equipment.length} equipment item(s)`}
        actions={
          <>
            <StatusBadge status={wo.status} />
            <Link className="btn btn-outline" to={`/print/wo/${id}`} target="_blank"><Icon name="printer" cls="btn-icon" /> Print</Link>
          </>
        } />

      {flash && <div className="alert success"><Icon name="check-circle" /><span>{flash}</span></div>}
      {err && <div className="alert error"><Icon name="alert" /><span>{err}</span></div>}

      <div className="grid-2">
        <div>
          <Panel title="Work Order Review" icon="file"
            right={
              <>
                <span className="pill">Ref: {wo.reference_number || "—"}</span>
                <span className={`badge ${wo.under_warranty ? "green" : "gray"}`}>{wo.under_warranty ? "Under Warranty" : "Paid"}</span>
              </>
            }>
            <div className="detail-grid">
              <div className="dg-item"><div className="dg-label">Work Order No.</div><div className="dg-value big-red">{wo.wo_number}</div></div>
              <div className="dg-item"><div className="dg-label">Work Order Date</div><div className="dg-value">{fmtDate(wo.wo_date)}</div></div>
              <div className="dg-item"><div className="dg-label">Customer</div><div className="dg-value">{wo.customer_name}</div></div>
              <div className="dg-item"><div className="dg-label">Contract No.</div><div className="dg-value">{wo.contract_number || "—"}</div></div>
              <div className="dg-item"><div className="dg-label">Reference No.</div><div className="dg-value">{wo.reference_number || "—"}</div></div>
              <div className="dg-item"><div className="dg-label">R&M Verification</div><div className="dg-value small">{wo.nrtc_check_remarks || "Verified"}</div></div>
            </div>
            {attachments.length > 0 && (
              <>
                <hr className="divider-gold" />
                <div className="dg-label mb-1">Work Order Attached Files ({attachments.length})</div>
                <div className="flex gap-1 flex-wrap">
                  {attachments.map((a) => (
                    <a key={a._id} className="file-chip" style={{ cursor: "pointer" }} onClick={() => openFile(`/files/${a._id}`)}>
                      <Icon name="file" /> {a.original_name}
                    </a>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Panel title="Parts Used (from Production II)" icon="box" bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead><tr><th>Equipment</th><th>Serial</th><th>Part Description</th><th>Store Code</th><th className="num">Qty</th><th className="num">Unit Price</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it._id}>
                      <td>{it.equipment_name}</td>
                      <td className="small">{it.equipment_serial || "—"}</td>
                      <td>{it.part_description || "—"}</td>
                      <td className="fw-bold">{it.store_code || "—"}</td>
                      <td className="num">{fmtQty(it.qty)}</td>
                      <td className="num">{fmtMoney(it.unit_price, currency)}</td>
                      <td className="num fw-bold">{fmtMoney(it.amount, currency)}</td>
                    </tr>
                  ))}
                  {!items.length && <tr><td colSpan={7}><EmptyState title="No parts recorded" icon="box" /></td></tr>}
                </tbody>
                <tfoot><tr><td colSpan={6} className="text-right">Total Parts (Components)</td>
                  <td className="num">{fmtMoney(bundle.parts_total, currency)}</td></tr></tfoot>
              </table>
            </div>
          </Panel>

          <Panel title="Labour Hours Charges (from Production II)" icon="gear-tool" bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead><tr><th>Section</th><th>Work Description</th><th className="num">Hours</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {labour.map((l) => (
                    <tr key={l._id}>
                      <td className="small">{SECTION_LABELS[l.section] || l.section}</td>
                      <td>{l.description}</td>
                      <td className="num">{fmtQty(l.hours)}</td>
                      <td className="num">{fmtMoney(l.rate, currency)}</td>
                      <td className="num fw-bold">{fmtMoney(l.amount, currency)}</td>
                    </tr>
                  ))}
                  {!labour.length && <tr><td colSpan={5}><EmptyState title="No labour charges recorded" icon="gear-tool" /></td></tr>}
                </tbody>
                <tfoot><tr><td colSpan={4} className="text-right">Total Labour</td>
                  <td className="num">{fmtMoney(bundle.labour_total, currency)}</td></tr></tfoot>
              </table>
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="Cost Sheet Issuance" icon="rupee" style={{ borderLeft: "4px solid var(--gov-gold)" }}>
            {editable ? (
              <form onSubmit={(e) => { e.preventDefault(); submit("submit"); }}>
                <div className="form-grid cols-2">
                  <div className="field">
                    <label>Cost Sheet No. <span className="req">*</span></label>
                    <input type="text" required value={form.cost_sheet_no} onChange={set("cost_sheet_no")} placeholder="e.g. CS/2026/0134" />
                  </div>
                  <div className="field">
                    <label>Cost Sheet Date <span className="req">*</span></label>
                    <input type="date" required value={form.cost_sheet_date} onChange={set("cost_sheet_date")} />
                  </div>
                  <div className="field">
                    <label>Component Amount (Parts) <span className="req">*</span></label>
                    <input type="number" step="0.01" min="0" required value={form.component_amount} onChange={set("component_amount")} />
                    <div className="hint">Prefilled from Production II parts total</div>
                  </div>
                  <div className="field">
                    <label>GST on Component ({gstC}%)</label>
                    <div className="readonly-value">{fmtMoney(compGst, currency)}</div>
                    <div className="hint">Calculated automatically</div>
                  </div>
                  <div className="field">
                    <label>Labour Charges <span className="req">*</span></label>
                    <input type="number" step="0.01" min="0" required value={form.labour_base} onChange={set("labour_base")} />
                    <div className="hint">Prefilled from Production II labour total</div>
                  </div>
                  <div className="field">
                    <label>GST on Labour ({gstL}%)</label>
                    <div className="readonly-value">{fmtMoney(labGst, currency)}</div>
                    <div className="hint">Calculated automatically</div>
                  </div>
                  <div className="field">
                    <label>I/C Costing</label>
                    <input type="number" step="0.01" min="0" value={form.ic_costing} onChange={set("ic_costing")} />
                  </div>
                  <div className="field">
                    <label>Total Amount</label>
                    <div className="readonly-value" style={{ fontSize: 19, fontWeight: 800, color: "#C00000" }}>{fmtMoney(total, currency)}</div>
                  </div>
                  <div className="field span-2">
                    <label>Remarks</label>
                    <textarea rows="2" placeholder="Costing remarks…" value={form.remarks} onChange={set("remarks")} />
                  </div>
                  <div className="field span-2">
                    <label>Attach Supporting Document (optional)</label>
                    <div className="file-drop" onClick={() => document.getElementById("cost-file")?.click()}>
                      <input id="cost-file" type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }}
                        onChange={(e) => setFile(e.target.files?.[0] || null)} />
                      <div className="fd-icon"><Icon name="upload" /></div>
                      <div className="fd-text">{file ? file.name : "Click to attach a cost sheet scan / supporting file"}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap mt-2">
                  <button type="button" className="btn btn-outline" onClick={() => submit("save")} disabled={busy}>
                    <Icon name="save" cls="btn-icon" /> Save Draft
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    <Icon name="send" cls="btn-icon" /> Submit to R&amp;M for Final Approval
                  </button>
                </div>
                <p className="help-text mt-2">On submission the cost sheet is issued and the work order returns to R&amp;M for final completion.</p>
              </form>
            ) : finance ? (
              <>
                <div className="detail-grid cols-2">
                  <div className="dg-item"><div className="dg-label">Cost Sheet No.</div><div className="dg-value">{finance.cost_sheet_no || "—"}</div></div>
                  <div className="dg-item"><div className="dg-label">Cost Sheet Date</div><div className="dg-value">{finance.cost_sheet_date || "—"}</div></div>
                  <div className="dg-item"><div className="dg-label">Component Amount</div><div className="dg-value money">{fmtMoney(finance.component_amount, currency)}</div></div>
                  <div className="dg-item"><div className="dg-label">GST Component ({gstC}%)</div><div className="dg-value money">{fmtMoney(finance.component_gst, currency)}</div></div>
                  <div className="dg-item"><div className="dg-label">Labour Charges</div><div className="dg-value money">{fmtMoney(finance.labour_base, currency)}</div></div>
                  <div className="dg-item"><div className="dg-label">GST Labour ({gstL}%)</div><div className="dg-value money">{fmtMoney(finance.labour_gst, currency)}</div></div>
                  <div className="dg-item"><div className="dg-label">I/C Costing</div><div className="dg-value money">{fmtMoney(finance.ic_costing, currency)}</div></div>
                  <div className="dg-item"><div className="dg-label">Total Amount</div><div className="dg-value big-red money">{fmtMoney(finance.total_amount, currency)}</div></div>
                  <div className="dg-item"><div className="dg-label">Issued By</div><div className="dg-value">{finance.submitter_name || "—"}</div></div>
                  <div className="dg-item"><div className="dg-label">Issued At</div><div className="dg-value small">{finance.submitted_at}</div></div>
                </div>
                {finance.remarks && <div className="tl-notes mt-2">{finance.remarks}</div>}
              </>
            ) : (
              <EmptyState title="Cost sheet not prepared" icon="rupee" />
            )}
          </Panel>

          <Panel title="Document" icon="printer">
            <p className="help-text mb-2">Review the complete work order file above. The attached reference file(s) are listed in the review panel — open them before issuing the cost sheet.</p>
            <button className="btn btn-outline btn-block" type="button" onClick={() => window.print()}>
              <Icon name="printer" cls="btn-icon" /> Print This Review
            </button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
