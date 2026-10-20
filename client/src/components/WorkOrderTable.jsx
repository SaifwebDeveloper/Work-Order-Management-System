import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { StatusBadge, GpPill, EmptyState, SectionPills } from "./ui.jsx";
import { fmtMoney, fmtDate } from "../utils.js";

// viewer: nrtc | p3c | production | finance
export default function WorkOrderTable({ viewer, items, currency = "Rs." }) {
  const detailBase = { nrtc: "/nrtc", p3c: "/p3c", production: "/production", finance: "/finance" }[viewer];

  return (
    <div className="table-wrap">
      <table className="gov-table">
        <thead>
          <tr>
            <th>W.O. No.</th>
            <th>Date</th>
            <th>Customer</th>
            {(viewer === "nrtc" || viewer === "p3c") && <th>Reference No.</th>}
            <th className="center">Equipment</th>
            {viewer === "production" && <th>Sections</th>}
            <th>Stage</th>
            {viewer === "nrtc" && <th className="num">Cost Sheet Total</th>}
            {viewer === "nrtc" && <th>Gate Pass</th>}
            {viewer === "finance" && <th>Cost Sheet No.</th>}
            {viewer === "finance" && <th className="num">Total Amount</th>}
            {viewer === "p3c" && <th>Verification</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w._id}>
              <td><span className="wo-num">{w.wo_number}</span></td>
              <td>{fmtDate(w.wo_date)}</td>
              <td>
                {w.customer_name}
                {w.customer_tag && <div className="small text-muted">{w.customer_tag}</div>}
              </td>
              {(viewer === "nrtc" || viewer === "p3c") && <td className="small">{w.reference_number || "—"}</td>}
              <td className="center">{w.equipment_count}</td>
              {viewer === "production" && (
                <td>
                  <SectionPills csv={w.sections_csv} />
                </td>
              )}
              <td>
                <StatusBadge status={w.status} />
                {viewer === "production" && w.total_sections > 0 && (
                  <div className="small text-muted">{w.submitted_count}/{w.total_sections} sections submitted</div>
                )}
              </td>
              {viewer === "nrtc" && <td className="num">{w.total_amount ? fmtMoney(w.total_amount, currency) : "—"}</td>}
              {viewer === "nrtc" && (
                <td><GpPill gpCount={w.gp_count} delivered={w.gp_delivered} /></td>
              )}
              {viewer === "finance" && <td className="small">{w.cost_sheet_no || (w.draft ? "Draft" : "—")}</td>}
              {viewer === "finance" && <td className="num fw-bold">{w.total_amount ? fmtMoney(w.total_amount, currency) : "—"}</td>}
              {viewer === "p3c" && (
                <td>
                  {w.endorsement_id ? (
                    <span className={`badge ${w.verified ? "green" : "amber"}`}>{w.verified ? "Verified" : "Unverified"}</span>
                  ) : (
                    <span className="badge gray">New</span>
                  )}
                </td>
              )}
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                <Link className="btn btn-ghost btn-xs" to={`${detailBase}/work-orders/${w._id}`}>
                  <Icon name="eye" /> Open
                </Link>
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan="10">
                <EmptyState title="No work orders found" sub="Adjust the filters or create a new work order." icon="clipboard" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
