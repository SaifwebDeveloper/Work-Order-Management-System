import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import api, { downloadFile, openFile } from "../../api";
import { fmtQty, fmtDate } from "../../utils";
import Icon from "../../components/Icon";
import { PageHead, Panel } from "../../components/ui";
import { useAuth } from "../../auth";

export default function GatepassView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ctx, setCtx] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(`/gatepass/${id}`).then((r) => setCtx(r.data)).catch((e) => setErr(e.response?.data?.error || e.message));
  }, [id]);

  if (err) return <div className="alert error"><Icon name="alert" /><span>{err}</span></div>;
  if (!ctx) return <div className="empty-state"><div className="es-sub">Loading…</div></div>;

  const { gp, wo, items, attachments, settings, qr_data } = ctx;
  const woBase = { nrtc_admin: "/nrtc", finance: "/finance", p3c: "/p3c", production: "/production" }[user.role] || "/nrtc";

  return (
    <div>
      <div className="no-print">
        <PageHead breadcrumb={<span><Link to={`${woBase}/work-orders/${wo._id}`}>Work Order {wo.wo_number}</Link> / Gate Pass</span>}
          title={<span>Gate Pass <span className="text-red">{gp.gp_number}</span></span>}
          sub={`Issued to ${gp.issued_to} · ${gp.created_at_display || gp.created_display} · by ${gp.issuer_name || "—"}`}
          actions={
            <>
              <button className="btn btn-primary" type="button" onClick={() => window.print()}>
                <Icon name="printer" cls="btn-icon" /> Print
              </button>
              <button className="btn btn-outline" onClick={() => downloadFile(`/gatepass/${id}/pdf`, `${gp.gp_number}.pdf`)}>
                <Icon name="download" cls="btn-icon" /> Download PDF
              </button>
              <button className="btn btn-outline" onClick={() => downloadFile(`/gatepass/${id}/xlsx`, `${gp.gp_number}.xlsx`)}>
                <Icon name="download" cls="btn-icon" /> Download Excel
              </button>
              <Link className="btn btn-outline" to={`${woBase}/work-orders/${wo._id}`}><Icon name="arrow-left" cls="btn-icon" /> Work Order</Link>
            </>
          } />
      </div>

      <div className="gp-sheet">
        <div className="gp-head">
          <img className="logo" src="/img/Nrtc_logo.png" alt="NRTC" />
          <div className="gp-head-text">
            <div className="gp-gov">GOVERNMENT OF PAKISTAN</div>
            <div className="gp-org">{String(settings.org_name || "").toUpperCase()}</div>
            <div className="gp-dept">{settings.dept_name} — {settings.tagline}</div>
          </div>
          <img className="gp-qr" src={qr_data} alt="QR" />
        </div>

        <div className="gp-rule"></div>
        <div className="gp-rule-thin"></div>

        <div className="gp-title">GATE PASS (MATERIAL)</div>
        <div className="gp-meta-row">
          <span><b>Gate Pass No.:</b> {gp.gp_number}</span>
          <span><b>Date:</b> {gp.created_display}</span>
          <span><b>Work Order No.:</b> {wo.wo_number}</span>
        </div>

        <div className="gp-sec-bar">Section A — Recipient / Movement Information</div>
        <table className="gp-info-table">
          <tbody>
            <tr>
              <td className="k">Issued To (Mr/Ms)</td><td>{gp.issued_to}</td>
              <td className="k">Designation</td><td>{gp.designation || "—"}</td>
            </tr>
            <tr>
              <td className="k">Basis / Through</td><td>{gp.basis_through || "—"}</td>
              <td className="k">Vehicle No.</td><td>{gp.vehicle_no || "—"}</td>
            </tr>
            <tr>
              <td className="k">Work Order No.</td><td>{wo.wo_number}</td>
              <td className="k">Customer / Formation</td><td>{wo.customer_name}</td>
            </tr>
            <tr>
              <td className="k">Pass Type</td>
              <td><b>{gp.returnable ? "RETURNABLE" : "NON-RETURNABLE"}</b></td>
              <td className="k">Expected Return</td><td>{gp.expected_return_date ? fmtDate(gp.expected_return_date) : "—"}</td>
            </tr>
          </tbody>
        </table>

        <div className="gp-sec-bar">Section B — Material / Equipment Details</div>
        <table className="gp-items-table">
          <thead>
            <tr>
              <th style={{ width: 52 }}>Sr. No</th>
              <th>Description of Material / Equipment</th>
              <th style={{ width: 150 }}>Serial Number</th>
              <th style={{ width: 64 }}>Qty</th>
              <th style={{ width: 60 }}>Unit</th>
              <th style={{ width: 170 }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it._id}>
                <td className="center">{it.sr_no}</td>
                <td>{it.description}</td>
                <td className="center">{it.serial_number || "—"}</td>
                <td className="center"><b>{fmtQty(it.quantity)}</b></td>
                <td className="center">{it.unit || "Nos"}</td>
                <td>{it.remarks || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {gp.remarks && <p className="small mb-2"><b>Remarks:</b> {gp.remarks}</p>}

        {attachments?.length > 0 && (
          <p className="small mb-2 no-print"><b>Attached work order file(s):</b>{" "}
            {attachments.map((a, i) => (
              <span key={a._id}>
                <a style={{ cursor: "pointer" }} onClick={() => openFile(`/files/${a._id}`)}>{a.original_name}</a>
                {i < attachments.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        )}

        <div className="gp-sign-row">
          <div className="gp-sign"><div className="gp-sign-line">Receiver's Name &amp; NIC No.</div></div>
          <div className="gp-sign"><div className="gp-sign-line">Security / Gate Incharge</div></div>
          <div className="gp-sign"><div className="gp-sign-line">{settings.sign_authority}<br /><span className="text-muted">(Issuing Authority — R&amp;M Dept)</span></div></div>
        </div>

        <div className="gp-note">
          {settings.footer_note} This pass is valid only for the material listed above.
          Digitally generated — no manual signature is mandatory. QR code carries the verification payload.
        </div>
      </div>

      <div className="mt-3 no-print" style={{ maxWidth: 860, marginLeft: "auto", marginRight: "auto" }}>
        <Panel title={`Delivery Position — Work Order ${wo.wo_number}`} icon="info">
          <p className="help-text">
            Open the <Link to={`${woBase}/work-orders/${wo._id}`}>work order dashboard</Link> to view the gate pass delivered status
            across all equipment, or issue an additional gate pass for remaining equipment.
          </p>
        </Panel>
      </div>
    </div>
  );
}
