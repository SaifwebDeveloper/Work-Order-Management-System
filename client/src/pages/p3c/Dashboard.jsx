import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, StatusBadge, EmptyState } from "../../components/ui.jsx";

export default function P3cDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/p3c/dashboard").then(({ data }) => setD(data));
  }, []);

  if (!d) return <div className="panel"><div className="panel-body">Loading…</div></div>;
  const c = d.counts;

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
        breadcrumb="P3 & C Department / Dashboard"
        title="P3&C Dashboard"
        sub="Endorse incoming work orders, verify and forward to Production II"
      />
      <div className="stat-grid">
        {stat("/p3c/work-orders?view=new", "c-amber", "file", c.new, "New Work Orders", "Awaiting endorsement")}
        {stat("/p3c/work-orders?view=review", "c-blue", "clock", c.review, "Under Review", "Saved, not verified")}
        {stat("/p3c/work-orders?view=verified", "c-violet", "check-circle", c.verified, "Verified", "Ready to forward")}
        {stat("/p3c/work-orders?view=forwarded", "c-green", "send", c.forwarded, "Forwarded", "With Production II")}
      </div>

      <Panel
        title="Endorsement Queue"
        icon="clipboard"
        right={<Link className="btn btn-ghost btn-sm" to="/p3c/work-orders">Full List <Icon name="arrow-right" cls="btn-icon" /></Link>}
        bodyClass="flush"
      >
        <div className="table-wrap">
          <table className="gov-table compact">
            <thead>
              <tr><th>W.O. No.</th><th>Date</th><th>Customer</th><th className="center">Equipment</th><th>State</th><th></th></tr>
            </thead>
            <tbody>
              {d.queue.map((w) => (
                <tr key={w._id}>
                  <td><span className="wo-num">{w.wo_number}</span></td>
                  <td>{w.wo_date}</td>
                  <td>{w.customer_name}</td>
                  <td className="center">{w.equipment_count}</td>
                  <td>
                    {w.endorsement_id ? (
                      <span className={`badge ${w.verified ? "green" : "amber"}`}>{w.verified ? "Verified" : "Unverified"}</span>
                    ) : (
                      <span className="badge gray">New</span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link className="btn btn-primary btn-xs" to={`/p3c/work-orders/${w._id}`}>
                      Endorse <Icon name="arrow-right" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!d.queue.length && (
                <tr><td colSpan="6"><EmptyState title="No work orders awaiting endorsement" icon="check-circle" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
