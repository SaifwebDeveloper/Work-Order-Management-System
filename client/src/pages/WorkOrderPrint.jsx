import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api.js";
import { fmtDate, fmtMoney, fmtDateTime, fmtQty, SECTION_LABELS, STATUS_LABELS } from "../utils.js";

// Print-friendly work order sheet (mirrors the Flask print view).
export default function WorkOrderPrint() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [settings, setSettings] = useState({ currency: "Rs.", org_name: "", dept_name: "", tagline: "" });

  useEffect(() => {
    api.get(`/wo/${id}`).then(({ data }) => setBundle(data)).catch(() => {});
    api.get("/settings").then(({ data }) => setSettings(data.settings)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (bundle) setTimeout(() => window.print(), 400);
  }, [bundle]);

  if (!bundle) return <div className="panel"><div className="panel-body">Loading…</div></div>;
  const { wo, equipment, items, labour, finance, endorsement, timeline, gatepasses } = bundle;
  const currency = settings.currency || "Rs.";

  return (
    <div className="gp-sheet">
      <div className="gp-head">
        <img className="logo" src="/img/Nrtc_logo.png" alt="NRTC" />
        <div className="gp-head-text">
          <div className="gp-gov">GOVERNMENT OF PAKISTAN</div>
          <div className="gp-org">{(settings.org_name || "").toUpperCase()}</div>
          <div className="gp-dept">{settings.dept_name} — {settings.tagline}</div>
        </div>
        <div style={{ width: 74 }}></div>
      </div>
      <div className="gp-rule"></div>
      <div className="gp-rule-thin"></div>

      <div className="gp-title">WORK ORDER</div>
      <div className="gp-meta-row">
        <span><b>Work Order No.:</b> {wo.wo_number}</span>
        <span><b>Date:</b> {fmtDate(wo.wo_date)}</span>
        <span><b>Status:</b> {STATUS_LABELS[wo.status]}</span>
      </div>

      <div className="gp-sec-bar">Work Order Information</div>
      <table className="gp-info-table">
        <tbody>
          <tr>
            <td className="k">Customer / Formation</td><td>{wo.customer_name}</td>
            <td className="k">Reference No.</td><td>{wo.reference_number || "—"}</td>
          </tr>
          <tr>
            <td className="k">Contract No.</td><td>{wo.contract_number || "—"}</td>
            <td className="k">Warranty</td><td><b>{wo.under_warranty ? "UNDER WARRANTY" : "PAID"}</b></td>
          </tr>
          {endorsement && (
            <tr>
              <td className="k">P3&C Reference</td><td>{endorsement.ref_no || "—"}</td>
              <td className="k">P3&C Ref Date</td><td>{endorsement.ref_date ? fmtDate(endorsement.ref_date) : "—"}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="gp-sec-bar">Equipment Under Repair</div>
      <table className="gp-items-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>Sr.</th>
            <th>Description of Equipment</th>
            <th style={{ width: 150 }}>Serial Number</th>
            <th style={{ width: 200 }}>Reported Defect</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((e, i) => (
            <tr key={e._id}>
              <td className="center">{i + 1}</td>
              <td><b>{e.name}</b></td>
              <td className="center">{e.serial_number || "—"}</td>
              <td>{e.defect || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="gp-sec-bar">Parts Used (Production II)</div>
      <table className="gp-items-table">
        <thead>
          <tr>
            <th>Equipment</th>
            <th>Part Description</th>
            <th style={{ width: 90 }}>Store Code</th>
            <th style={{ width: 60 }}>Qty</th>
            <th style={{ width: 90 }}>Unit Price</th>
            <th style={{ width: 90 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((it) => (
              <tr key={it._id}>
                <td>{it.equipment_name}</td>
                <td>{it.part_description || "—"}</td>
                <td className="center">{it.store_code || "—"}</td>
                <td className="center">{fmtQty(it.qty)} {it.unit}</td>
                <td className="center">{fmtMoney(it.unit_price, currency)}</td>
                <td className="center"><b>{fmtMoney(it.amount, currency)}</b></td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="6">No parts recorded</td></tr>
          )}
          <tr>
            <td colSpan="5" style={{ textAlign: "right" }}><b>Total Parts</b></td>
            <td className="center"><b>{fmtMoney(bundle.parts_total, currency)}</b></td>
          </tr>
        </tbody>
      </table>

      <div className="gp-sec-bar">Labour Hours Charges (Production II)</div>
      <table className="gp-items-table">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Section</th>
            <th>Work Description</th>
            <th style={{ width: 60 }}>Hours</th>
            <th style={{ width: 90 }}>Rate</th>
            <th style={{ width: 90 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {labour.length ? (
            labour.map((l) => (
              <tr key={l._id}>
                <td>{SECTION_LABELS[l.section] || l.section}</td>
                <td>{l.description}</td>
                <td className="center">{fmtQty(l.hours)}</td>
                <td className="center">{fmtMoney(l.rate, currency)}</td>
                <td className="center"><b>{fmtMoney(l.amount, currency)}</b></td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="5">No labour charges recorded</td></tr>
          )}
          <tr>
            <td colSpan="4" style={{ textAlign: "right" }}><b>Total Labour</b></td>
            <td className="center"><b>{fmtMoney(bundle.labour_total, currency)}</b></td>
          </tr>
        </tbody>
      </table>

      {finance && (
        <>
          <div className="gp-sec-bar">Cost Sheet</div>
          <table className="gp-info-table">
            <tbody>
              <tr>
                <td className="k">Cost Sheet No.</td><td>{finance.cost_sheet_no || "—"}</td>
                <td className="k">Date</td><td>{finance.cost_sheet_date ? fmtDate(finance.cost_sheet_date) : "—"}</td>
              </tr>
              <tr>
                <td className="k">Component + GST</td>
                <td>{fmtMoney(finance.component_amount, currency)} + {fmtMoney(finance.component_gst, currency)}</td>
                <td className="k">Labour + GST</td>
                <td>{fmtMoney(finance.labour_base, currency)} + {fmtMoney(finance.labour_gst, currency)}</td>
              </tr>
              <tr>
                <td className="k">I/C Costing</td><td>{fmtMoney(finance.ic_costing, currency)}</td>
                <td className="k"><b>Total Amount</b></td>
                <td><b>{fmtMoney(finance.total_amount, currency)}</b></td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <div className="gp-sec-bar">Work Order Trail</div>
      <table className="gp-items-table">
        <tbody>
          {timeline.map((t) => (
            <tr key={t._id}>
              <td style={{ width: 150 }} className="small">{fmtDateTime(t.created_at)}</td>
              <td><b>{t.action}</b>{t.notes ? ` — ${t.notes}` : ""}</td>
              <td style={{ width: 140 }} className="small">{t.actor_name || "System"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="gp-sign-row">
        <div className="gp-sign"><div className="gp-sign-line">Customer Representative</div></div>
        <div className="gp-sign"><div className="gp-sign-line">P3 &amp; C Representative</div></div>
        <div className="gp-sign"><div className="gp-sign-line">{settings.sign_authority}<br /><span className="text-muted">(Repair &amp; Maintenance Dept)</span></div></div>
      </div>
      <div className="gp-note">
        This is a system generated document of NRTC — Repair &amp; Maintenance Department.
        {gatepasses.length > 0 ? ` Gate pass(s) on file: ${gatepasses.map((g) => g.gp_number).join(", ")}.` : ""}
      </div>
    </div>
  );
}
