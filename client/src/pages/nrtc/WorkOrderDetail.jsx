import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import api, { errorText, openFile, downloadFile } from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, StatusBadge, Stepper, EmptyState } from "../../components/ui.jsx";
import { fmtDate, fmtDateTime, fmtMoney, fmtQty, SECTION_LABELS, STATUS_LABELS } from "../../utils.js";

export default function NrtcWorkOrderDetail() {
  const { id } = useParams();
  const { pushFlash } = useOutletContext();
  const [bundle, setBundle] = useState(null);
  const [settings, setSettings] = useState({ currency: "Rs." });
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, { data: s }] = await Promise.all([
      api.get(`/nrtc/work-orders/${id}`),
      api.get("/settings"),
    ]);
    setBundle(data);
    setSettings(s.settings);
    setVerifyRemarks(data.wo.nrtc_check_remarks || "");
  }, [id]);

  useEffect(() => {
    load().catch((e) => pushFlash(errorText(e), "error"));
  }, [load, pushFlash]);

  if (!bundle) return <div className="panel"><div className="panel-body">Loading…</div></div>;
  const { wo, equipment, endorsement, sections, items, labour, finance, attachments, timeline, gatepasses, delivery, parts_total, labour_total } = bundle;
  const currency = settings.currency || "Rs.";

  async function action(path, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await api.post(path);
      await load();
    } catch (err) {
      pushFlash(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  }

  const deliveryBadge = (s) =>
    s === "submitted" ? (
      <span className="badge green">Submitted</span>
    ) : s === "in_progress" ? (
      <span className="badge blue">In Progress</span>
    ) : (
      <span className="badge amber">Not Started</span>
    );

  return (
    <>
      <PageHead
        breadcrumb={<><Link to="/nrtc">Dashboard</Link> / <Link to="/nrtc/work-orders">Work Orders</Link> / {wo.wo_number}</>}
        title={<span>Work Order <span className="text-red">#{wo.wo_number}</span></span>}
        sub={`${wo.customer_name} · ${STATUS_LABELS[wo.status]}`}
        actions={
          <>
            <StatusBadge status={wo.status} />
            <Link className="btn btn-outline" to={`/print/wo/${wo._id}`} target="_blank">
              <Icon name="printer" cls="btn-icon" /> Print
            </Link>
            <button className="btn btn-outline" onClick={() => downloadFile(`/nrtc/work-orders/${wo._id}/pdf`, `WorkOrder-${wo.wo_number}.pdf`)}>
              <Icon name="download" cls="btn-icon" /> PDF
            </button>
          </>
        }
      />

      <Panel>
        <Stepper status={wo.status} />
      </Panel>

      <div className="grid-2">
        <div>
          <Panel
            title="Work Order Information"
            icon="file"
            right={
              <>
                <span className="pill">Ref: {wo.reference_number || "—"}</span>
                <span className={`badge ${wo.under_warranty ? "green" : "gray"}`}>{wo.under_warranty ? "Under Warranty" : "Paid"}</span>
              </>
            }
          >
            <div className="detail-grid">
              <div className="dg-item"><div className="dg-label">Work Order No.</div><div className="dg-value big-red">{wo.wo_number}</div></div>
              <div className="dg-item"><div className="dg-label">Work Order Date</div><div className="dg-value">{fmtDate(wo.wo_date)}</div></div>
              <div className="dg-item"><div className="dg-label">Customer / Formation</div><div className="dg-value">{wo.customer_name}</div></div>
              <div className="dg-item"><div className="dg-label">Contract No.</div><div className="dg-value">{wo.contract_number || "—"}</div></div>
              <div className="dg-item"><div className="dg-label">Reference No.</div><div className="dg-value">{wo.reference_number || "—"}</div></div>
              <div className="dg-item"><div className="dg-label">R&M Check Remarks</div><div className="dg-value small">{wo.nrtc_check_remarks || "—"}</div></div>
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

          <Panel title="Equipment Under Repair" icon="box" right={<span className="pill">{equipment.length} item(s)</span>} bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table">
                <thead><tr><th>#</th><th>Equipment</th><th>Serial Number</th><th>Reported Defect</th><th className="center">Delivery</th></tr></thead>
                <tbody>
                  {equipment.map((e, i) => {
                    const d = (delivery.equipment || []).find((x) => String(x.id) === String(e._id));
                    return (
                      <tr key={e._id}>
                        <td>{i + 1}</td>
                        <td className="fw-bold">{e.name}</td>
                        <td>{e.serial_number || "—"}</td>
                        <td className="small">{e.defect || "—"}</td>
                        <td className="center">
                          {d ? (
                            <span className={`badge ${d.done ? "green" : d.delivered > 0 ? "gold" : "gray"}`}>
                              {fmtQty(d.delivered)}/{fmtQty(d.quantity)} {d.unit}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {endorsement && (
            <Panel title="P3&C Endorsement" icon="check-circle" right={endorsement.verified ? <span className="badge green">Verified</span> : <span className="badge amber">Unverified</span>}>
              <div className="detail-grid cols-2">
                <div className="dg-item"><div className="dg-label">P3&C Ref No.</div><div className="dg-value">{endorsement.ref_no || "—"}</div></div>
                <div className="dg-item"><div className="dg-label">Ref Date</div><div className="dg-value">{endorsement.ref_date ? fmtDate(endorsement.ref_date) : "—"}</div></div>
                <div className="dg-item"><div className="dg-label">Endorsed At</div><div className="dg-value small">{fmtDateTime(endorsement.endorsed_at)}</div></div>
                <div className="dg-item"><div className="dg-label">Forwarded At</div><div className="dg-value small">{fmtDateTime(endorsement.forwarded_at)}</div></div>
              </div>
              {endorsement.remarks && <div className="tl-notes mt-2">{endorsement.remarks}</div>}
            </Panel>
          )}

          <Panel title="Production II Summary" icon="gear-tool" bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead><tr><th>Section</th><th>State</th><th className="num">Parts Amount</th><th className="num">Labour Amount</th></tr></thead>
                <tbody>
                  {sections.map((s) => {
                    const parts = items.filter((it) => it.section === s.section).reduce((sum, it) => sum + (it.amount || 0), 0);
                    const lab = labour.filter((l) => l.section === s.section).reduce((sum, l) => sum + (l.amount || 0), 0);
                    return (
                      <tr key={s._id}>
                        <td>{SECTION_LABELS[s.section] || s.section}</td>
                        <td>{deliveryBadge(s.status)}</td>
                        <td className="num">{fmtMoney(parts, currency)}</td>
                        <td className="num">{fmtMoney(lab, currency)}</td>
                      </tr>
                    );
                  })}
                  {!sections.length && <tr><td colSpan="4"><EmptyState title="Not yet forwarded to Production II" icon="gear-tool" /></td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Work Order Trail" icon="clock">
            <div className="timeline">
              {timeline.map((t, i) => (
                <div className={`tl-item ${i === 0 ? "tl-gold" : ""} ${t.stage === "production" ? "tl-green" : ""}`} key={t._id}>
                  <div className="tl-action">{t.action}</div>
                  <div className="tl-meta">{t.actor_name || "System"} · {t.created_at}</div>
                  {t.notes && <div className="tl-notes">{t.notes}</div>}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="Cost Sheet (Finance)" icon="rupee" style={{ borderLeft: "4px solid var(--gov-gold)" }}>
            {finance ? (
              <div className="detail-grid cols-2">
                <div className="dg-item"><div className="dg-label">Cost Sheet No.</div><div className="dg-value">{finance.cost_sheet_no || "—"}</div></div>
                <div className="dg-item"><div className="dg-label">Cost Sheet Date</div><div className="dg-value">{fmtDate(finance.cost_sheet_date)}</div></div>
                <div className="dg-item"><div className="dg-label">Component Amount</div><div className="dg-value money">{fmtMoney(finance.component_amount, currency)}</div></div>
                <div className="dg-item"><div className="dg-label">Labour Charges</div><div className="dg-value money">{fmtMoney(finance.labour_base, currency)}</div></div>
                <div className="dg-item"><div className="dg-label">I/C Costing</div><div className="dg-value money">{fmtMoney(finance.ic_costing, currency)}</div></div>
                <div className="dg-item"><div className="dg-label">Total Amount</div><div className="dg-value big-red money">{fmtMoney(finance.total_amount, currency)}</div></div>
              </div>
            ) : (
              <EmptyState title="No cost sheet issued yet" icon="rupee" />
            )}
          </Panel>

          <Panel
            title={`Gate Passes (${gatepasses.length})`}
            icon="truck"
            right={
              wo.status === "completed" && delivery.overall !== "delivered" ? (
                <Link className="btn btn-gold btn-sm" to={`/gatepasses/new/${wo._id}`}>
                  <Icon name="plus" cls="btn-icon" /> Issue Gate Pass
                </Link>
              ) : null
            }
            bodyClass="flush"
          >
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead><tr><th>Gate Pass No.</th><th>Date</th><th>Issued To</th><th className="center">Items</th><th></th></tr></thead>
                <tbody>
                  {gatepasses.map((g) => (
                    <tr key={g._id}>
                      <td className="fw-bold" style={{ color: "var(--gov-blue-deep)" }}>{g.gp_number}</td>
                      <td>{g.created_display}</td>
                      <td className="small">{g.issued_to}</td>
                      <td className="center">{g.item_count}</td>
                      <td className="text-right">
                        <Link className="btn btn-ghost btn-xs" to={`/gatepasses/${g._id}`}><Icon name="eye" /></Link>
                      </td>
                    </tr>
                  ))}
                  {!gatepasses.length && (
                    <tr><td colSpan="5"><EmptyState title="No gate pass issued yet" sub={wo.status === "completed" ? "Issue the first gate pass for delivery." : "Available after final completion."} icon="truck" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {delivery.overall === "delivered" && <div className="alert success mt-2"><Icon name="check-circle" /><span>All equipment has been fully delivered.</span></div>}
            {delivery.overall === "partial" && <div className="alert info mt-2"><Icon name="info" /><span>Partial delivery — some equipment is still pending.</span></div>}
          </Panel>

          <Panel title="Departmental Actions" icon="send" style={{ borderLeft: "4px solid var(--gov-blue-mid)" }}>
            {wo.status === "draft" && (
              <button className="btn btn-primary btn-block" disabled={busy} onClick={() => action(`/nrtc/work-orders/${wo._id}/forward-draft`)}>
                <Icon name="send" cls="btn-icon" /> Forward to P3&C
              </button>
            )}
            {wo.status === "pending_nrtc_check" && (
              <>
                <div className="field mb-2">
                  <label>R&M Check Remarks</label>
                  <textarea rows="2" value={verifyRemarks} onChange={(e) => setVerifyRemarks(e.target.value)} placeholder="Verification observations…" />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api.post(`/nrtc/work-orders/${wo._id}/verify`, { remarks: verifyRemarks });
                      await load();
                    } catch (err) {
                      pushFlash(errorText(err), "error");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Icon name="check-circle" cls="btn-icon" /> Verify &amp; Forward to Finance
                </button>
              </>
            )}
            {wo.status === "pending_nrtc_final" && (
              <button
                className="btn btn-gold btn-block"
                disabled={busy}
                onClick={() => action(`/nrtc/work-orders/${wo._id}/finalize`, "Grant final approval? The work order will be marked completed.")}
              >
                <Icon name="check-circle" cls="btn-icon" /> Grant Final Approval (Complete)
              </button>
            )}
            {!["draft", "pending_nrtc_check", "pending_nrtc_final"].includes(wo.status) && (
              <p className="help-text">
                {wo.status === "pending_p3c" && "Awaiting P3&C endorsement — no action required from R&M right now."}
                {wo.status === "pending_production" && "Production II sections are working on this order."}
                {wo.status === "pending_finance" && "Finance is preparing the cost sheet."}
                {wo.status === "completed" && "Work order completed. Manage delivery through the Gate Pass panel."}
              </p>
            )}
            <div className="mt-2">
              <div className="dg-label mb-1">Production totals</div>
              <div className="flex gap-1">
                <span className="pill">Parts: {fmtMoney(parts_total, currency)}</span>
                <span className="pill">Labour: {fmtMoney(labour_total, currency)}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
