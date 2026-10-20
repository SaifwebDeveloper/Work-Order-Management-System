import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, StatusBadge, BarChart, GpPill, EmptyState } from "../../components/ui.jsx";
import { fmtMoney } from "../../utils.js";

export default function NrtcDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/nrtc/dashboard").then(({ data }) => setD(data));
  }, []);

  if (!d) return <div className="panel"><div className="panel-body">Loading…</div></div>;
  const sc = d.status_counts;
  const stat = (href, cls, icon, value, label, hint) => (
    <Link className={`stat-card ${cls}`} to={href} key={label}>
      <span className="sc-icon"><Icon name={icon} /></span>
      <span>
        <span className="sc-value">{value}</span>
        <br />
        <span className="sc-label">{label}</span>
        <div className="sc-hint">{hint}</div>
      </span>
    </Link>
  );

  return (
    <>
      <PageHead
        breadcrumb="Repair & Maintenance / Dashboard"
        title="R&M Dashboard"
        sub="Work order pipeline, gate passes and item master overview"
        actions={
          <Link className="btn btn-gold" to="/nrtc/create">
            <Icon name="plus" cls="btn-icon" /> Create Work Order
          </Link>
        }
      />

      <div className="stat-grid">
        {stat("/nrtc/work-orders", "c-blue", "clipboard", sc.pending_p3c || 0, "Pending P3&C", "Awaiting endorsement")}
        {stat("/nrtc/work-orders?status=pending_production", "c-amber", "gear-tool", sc.pending_production || 0, "With Production II", "Sections in progress")}
        {stat("/nrtc/work-orders?status=pending_nrtc_check", "c-violet", "search", sc.pending_nrtc_check || 0, "Pending R&M Check", "Production submitted")}
        {stat("/nrtc/work-orders?status=pending_finance", "c-teal", "rupee", sc.pending_finance || 0, "Pending Finance", "Awaiting cost sheet")}
        {stat("/nrtc/work-orders?status=pending_nrtc_final", "c-gold", "check-circle", sc.pending_nrtc_final || 0, "Final Approval", "Cost sheet issued")}
        {stat("/nrtc/work-orders?status=completed", "c-green", "check-circle", sc.completed || 0, "Completed", "Gate pass ready")}
      </div>

      <div className="grid-2">
        <div>
          <Panel
            title="Work Order Pipeline"
            icon="chart"
            right={<Link className="btn btn-ghost btn-sm" to="/nrtc/work-orders">Full Register <Icon name="arrow-right" cls="btn-icon" /></Link>}
            bodyClass="flush"
          >
            <div style={{ padding: "8px 12px" }}>
              <BarChart data={d.chart_data} />
            </div>
          </Panel>

          <Panel title="Item Master" icon="box" bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table compact">
                <tbody>
                  <tr>
                    <td>Inventory items</td>
                    <td className="num fw-bold">{d.inventory_count}</td>
                    <td className="text-right">
                      <Link className="btn btn-ghost btn-xs" to="/nrtc/inventory">Open <Icon name="arrow-right" /></Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Inventory value (sum of rates)</td>
                    <td className="num fw-bold">{fmtMoney(d.inventory_value, d.settings?.currency)}</td>
                    <td className="text-right">
                      <Link className="btn btn-ghost btn-xs" to="/nrtc/inventory/import">Import <Icon name="upload" /></Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Gate passes issued</td>
                    <td className="num fw-bold">{d.gatepass_count}</td>
                    <td className="text-right">
                      <Link className="btn btn-ghost btn-xs" to="/gatepasses">Register <Icon name="truck" /></Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div>
          <Panel
            title="Recent Work Orders"
            icon="clipboard"
            right={<Link className="btn btn-ghost btn-sm" to="/nrtc/work-orders">All <Icon name="arrow-right" cls="btn-icon" /></Link>}
            bodyClass="flush"
          >
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead>
                  <tr><th>W.O. No.</th><th>Customer</th><th>Stage</th><th className="num">Cost Sheet</th><th></th></tr>
                </thead>
                <tbody>
                  {d.recent.map((w) => (
                    <tr key={w._id}>
                      <td><span className="wo-num">{w.wo_number}</span></td>
                      <td>{w.customer_name}</td>
                      <td><StatusBadge status={w.status} /></td>
                      <td className="num">{w.total_amount ? fmtMoney(w.total_amount, d.settings?.currency) : "—"}</td>
                      <td className="text-right">
                        <Link className="btn btn-ghost btn-xs" to={`/nrtc/work-orders/${w._id}`}><Icon name="eye" /></Link>
                      </td>
                    </tr>
                  ))}
                  {!d.recent.length && (
                    <tr><td colSpan="5"><EmptyState title="No work orders yet" sub="Create the first work order." icon="clipboard" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Recent Activity" icon="clock" bodyClass="flush">
            <div style={{ padding: "4px 16px" }}>
              <div className="timeline">
                {d.activity.map((a, i) => (
                  <div className={`tl-item ${i === d.activity.length - 1 ? "tl-gold" : ""} ${a.action.includes("completed") ? "tl-green" : ""}`} key={a._id}>
                    <div className="tl-action">
                      W.O. #{a.wo_number} — {a.action}
                    </div>
                    <div className="tl-meta">{a.actor_name || "System"} · {a.created_at}</div>
                  </div>
                ))}
                {!d.activity.length && <EmptyState title="No activity yet" icon="clock" />}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
