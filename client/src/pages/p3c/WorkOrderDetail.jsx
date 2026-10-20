import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import api, { errorText, openFile } from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, StatusBadge, Stepper, EmptyState } from "../../components/ui.jsx";
import { fmtDate, fmtDateTime } from "../../utils.js";
import { PRODUCTION_SECTIONS, SECTION_LABELS } from "../../utils.js";

export default function P3cWorkOrderDetail() {
  const { id } = useParams();
  const { pushFlash } = useOutletContext();
  const [bundle, setBundle] = useState(null);
  const [form, setForm] = useState({ ref_no: "", ref_date: "", remarks: "", p3c_ref_number: "", verified: "0", sections: [] });
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get(`/p3c/work-orders/${id}`);
    setBundle(data);
    if (data.endorsement) {
      setForm({
        ref_no: data.endorsement.ref_no || "",
        ref_date: data.endorsement.ref_date || "",
        remarks: data.endorsement.remarks || "",
        p3c_ref_number: data.endorsement.p3c_ref_number || "",
        verified: data.endorsement.verified ? "1" : "0",
        sections: data.sections.map((s) => s.section),
      });
    }
  }, [id]);

  useEffect(() => {
    load().catch((e) => pushFlash(errorText(e), "error"));
  }, [load, pushFlash]);

  if (!bundle) return <div className="panel"><div className="panel-body">Loading…</div></div>;
  const { wo, equipment, endorsement, sections, attachments, timeline } = bundle;
  const editable = wo.status === "pending_p3c";

  function toggleSection(key) {
    setForm((f) => {
      if (key === "all") {
        return { ...f, sections: f.sections.includes("all") ? [] : ["all"] };
      }
      const withoutAll = f.sections.filter((s) => s !== "all");
      return {
        ...f,
        sections: withoutAll.includes(key) ? withoutAll.filter((s) => s !== key) : [...withoutAll, key],
      };
    });
  }

  async function submit(action) {
    setBusy(action);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "sections") v.forEach((s) => payload.append("sections", s));
        else payload.append(k, v);
      });
      payload.append("action", action);
      await api.post(`/p3c/work-orders/${wo._id}/endorse`, payload);
      pushFlash(
        action === "forward" ? "Work order forwarded to Production II." : action === "verify" ? "Verification recorded." : "Draft saved.",
        "success"
      );
      await load();
    } catch (err) {
      pushFlash(errorText(err), "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHead
        breadcrumb={<><Link to="/p3c">Dashboard</Link> / <Link to="/p3c/work-orders">Work Orders</Link> / {wo.wo_number}</>}
        title={<span>Endorsement — W.O. <span className="text-red">#{wo.wo_number}</span></span>}
        sub={`${wo.customer_name} · ${equipment.length} equipment item(s)`}
        actions={
          <>
            <StatusBadge status={wo.status} />
            <Link className="btn btn-outline" to={`/print/wo/${wo._id}`} target="_blank">
              <Icon name="printer" cls="btn-icon" /> Print
            </Link>
          </>
        }
      />

      <Panel>
        <Stepper status={wo.status} />
      </Panel>

      <div className="grid-2">
        <div>
          <Panel title="Work Order Review" icon="file" right={<span className="pill">Ref: {wo.reference_number || "—"}</span>}>
            <div className="detail-grid">
              <div className="dg-item"><div className="dg-label">Work Order No.</div><div className="dg-value big-red">{wo.wo_number}</div></div>
              <div className="dg-item"><div className="dg-label">Work Order Date</div><div className="dg-value">{fmtDate(wo.wo_date)}</div></div>
              <div className="dg-item"><div className="dg-label">Customer / Formation</div><div className="dg-value">{wo.customer_name}</div></div>
              <div className="dg-item"><div className="dg-label">Reference No.</div><div className="dg-value">{wo.reference_number || "—"}</div></div>
              <div className="dg-item"><div className="dg-label">Contract No.</div><div className="dg-value">{wo.contract_number || "—"}</div></div>
              <div className="dg-item"><div className="dg-label">Warranty</div><div className="dg-value">{wo.under_warranty ? "Under Warranty" : "Paid"}</div></div>
            </div>
            {attachments.length > 0 && (
              <>
                <hr className="divider-gold" />
                <div className="dg-label mb-1">Attached Files ({attachments.length})</div>
                <div className="flex gap-1 flex-wrap">
                  {attachments.map((a) => (
                    <a className="file-chip" style={{ cursor: "pointer" }} onClick={() => openFile(`/files/${a._id}`)} key={a._id}>
                      <Icon name="file" /> {a.original_name}
                    </a>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Panel title="Equipment & Reported Defects" icon="box" bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table">
                <thead><tr><th>#</th><th>Equipment</th><th>Serial Number</th><th>Reported Defect</th></tr></thead>
                <tbody>
                  {equipment.map((e, i) => (
                    <tr key={e._id}>
                      <td>{i + 1}</td>
                      <td className="fw-bold">{e.name}</td>
                      <td>{e.serial_number || "—"}</td>
                      <td className="small">{e.defect || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Work Order Trail" icon="clock">
            <div className="timeline">
              {timeline.map((t, i) => (
                <div className={`tl-item ${i === 0 ? "tl-gold" : ""}`} key={t._id}>
                  <div className="tl-action">{t.action}</div>
                  <div className="tl-meta">{t.actor_name || "System"} · {t.created_at}</div>
                  {t.notes && <div className="tl-notes">{t.notes}</div>}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="P3&C Endorsement" icon="check-circle" style={{ borderLeft: "4px solid var(--gov-gold)" }}>
            {editable ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit("forward");
                }}
              >
                <div className="form-grid cols-2">
                  <div className="field">
                    <label>P3&C Reference No. <span className="req">*</span></label>
                    <input type="text" value={form.ref_no} onChange={(e) => setForm((f) => ({ ...f, ref_no: e.target.value }))} placeholder="e.g. P3C/END/2026/0001" />
                  </div>
                  <div className="field">
                    <label>Reference Date <span className="req">*</span></label>
                    <input type="date" value={form.ref_date} onChange={(e) => setForm((f) => ({ ...f, ref_date: e.target.value }))} />
                  </div>
                  <div className="field span-2">
                    <label>Internal Tracking / File No.</label>
                    <input type="text" value={form.p3c_ref_number} onChange={(e) => setForm((f) => ({ ...f, p3c_ref_number: e.target.value }))} placeholder="Optional internal reference" />
                  </div>
                </div>

                <div className="field mt-2">
                  <label>Verification <span className="req">*</span></label>
                  <div className="radio-row">
                    <label>
                      <input type="radio" name="verified" value="1" checked={form.verified === "1"} onChange={() => setForm((f) => ({ ...f, verified: "1" }))} /> Verified
                    </label>
                    <label>
                      <input type="radio" name="verified" value="0" checked={form.verified === "0"} onChange={() => setForm((f) => ({ ...f, verified: "0" }))} /> Not Verified
                    </label>
                  </div>
                </div>

                <div className="field mt-2">
                  <label>Assign Production II Sections <span className="req">*</span></label>
                  <div className="flex gap-1 flex-wrap">
                    <label className={`section-check ${form.sections.includes("all") ? "checked" : ""}`}>
                      <input type="checkbox" value="all" checked={form.sections.includes("all")} onChange={() => toggleSection("all")} className="visually-hidden" />
                      All Sections
                    </label>
                    {PRODUCTION_SECTIONS.filter(([k]) => k !== "other").map(([key, label]) => (
                      <label className={`section-check ${form.sections.includes(key) ? "checked" : ""}`} key={key}>
                        <input type="checkbox" value={key} checked={form.sections.includes(key)} onChange={() => toggleSection(key)} className="visually-hidden" />
                        {label.replace(" Section", "")}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field mt-2">
                  <label>Remarks</label>
                  <textarea rows="2" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Endorsement observations…" />
                </div>

                <div className="flex gap-1 flex-wrap mt-2">
                  <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => submit("save")}>
                    <Icon name="save" cls="btn-icon" /> {busy === "save" ? "Saving…" : "Save Draft"}
                  </button>
                  <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => submit("verify")}>
                    <Icon name="check" cls="btn-icon" /> {busy === "verify" ? "Saving…" : "Save & Mark Verified"}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!!busy}>
                    <Icon name="send" cls="btn-icon" /> {busy === "forward" ? "Forwarding…" : "Forward to Production II"}
                  </button>
                </div>
              </form>
            ) : endorsement ? (
              <>
                <div className="detail-grid cols-2">
                  <div className="dg-item"><div className="dg-label">P3&C Reference No.</div><div className="dg-value">{endorsement.ref_no || "—"}</div></div>
                  <div className="dg-item"><div className="dg-label">Reference Date</div><div className="dg-value">{fmtDate(endorsement.ref_date)}</div></div>
                  <div className="dg-item"><div className="dg-label">Verification</div><div className="dg-value">{endorsement.verified ? "Verified" : "Not Verified"}</div></div>
                  <div className="dg-item"><div className="dg-label">Endorsed At</div><div className="dg-value small">{fmtDateTime(endorsement.endorsed_at)}</div></div>
                </div>
                {endorsement.remarks && <div className="tl-notes mt-2">{endorsement.remarks}</div>}
              </>
            ) : (
              <EmptyState title="No endorsement recorded" icon="check-circle" />
            )}
          </Panel>

          <Panel title="Assigned Production Sections" icon="layers" bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead><tr><th>Section</th><th>Status</th><th>Submitted By</th></tr></thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s._id}>
                      <td>{SECTION_LABELS[s.section] || s.section}</td>
                      <td>
                        {s.status === "submitted" ? <span className="badge green">Submitted</span> : s.status === "in_progress" ? <span className="badge blue">In Progress</span> : <span className="badge amber">Not Started</span>}
                      </td>
                      <td className="small">{s.submitted_by ? "—" : "—"}</td>
                    </tr>
                  ))}
                  {!sections.length && <tr><td colSpan="3"><EmptyState title="No sections assigned yet" icon="layers" /></td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
