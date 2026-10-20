import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { useAuth } from "../../auth.jsx";
import { PageHead, Panel, BarChart, EmptyState, SectionPills } from "../../components/ui.jsx";
import { SECTION_LABELS } from "../../utils.js";

export default function ProductionDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/production/dashboard").then(({ data }) => setD(data));
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
        breadcrumb="Production II Department / Dashboard"
        title="Production II Dashboard"
        sub={user.section ? SECTION_LABELS[user.section] : "All sections — supervisory view"}
      />
      <div className="stat-grid">
        {stat("/production/work-orders?view=new", "c-amber", "file", c.new_assignments, "New Assignments", "Not started yet")}
        {stat("/production/work-orders?view=progress", "c-blue", "gear-tool", c.in_progress, "Work In Progress", "Entries saved, not submitted")}
        {stat("/production/work-orders", "c-violet", "clipboard", c.all_open, "Pending at Sections", "All open work orders")}
        {stat("/production/work-orders?view=awaiting", "c-teal", "send", c.awaiting_rm, "Submitted / With R&M", "Awaiting verification")}
        {stat("/production/work-orders?view=completed", "c-green", "check-circle", c.completed, "Completed", "Fully approved work orders")}
      </div>

      <div className="grid-2">
        <div>
          <Panel
            title="Upcoming / New Work Orders"
            icon="clipboard"
            right={<Link className="btn btn-ghost btn-sm" to="/production/work-orders">Full List <Icon name="arrow-right" cls="btn-icon" /></Link>}
            bodyClass="flush"
          >
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead><tr><th>W.O. No.</th><th>Date</th><th>Customer</th><th>Sections</th><th>State</th><th></th></tr></thead>
                <tbody>
                  {d.queue.map((w) => (
                    <tr key={w._id}>
                      <td><span className="wo-num">{w.wo_number}</span></td>
                      <td>{w.wo_date}</td>
                      <td>{w.customer_name}</td>
                      <td><SectionPills csv={w.sections_csv} /></td>
                      <td>
                        {w.lowest_status === "pending" ? <span className="badge amber">Not started</span> : w.lowest_status === "submitted" ? <span className="badge green">Submitted</span> : <span className="badge blue">In progress</span>}
                      </td>
                      <td className="text-right">
                        <Link className="btn btn-primary btn-xs" to={`/production/work-orders/${w._id}`}>Open <Icon name="arrow-right" /></Link>
                      </td>
                    </tr>
                  ))}
                  {!d.queue.length && (
                    <tr><td colSec="6" colSpan="6"><EmptyState title="No pending work orders" sub="New assignments from P3 & C will appear here." icon="clipboard" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Open Work Orders by Section" icon="chart">
            <BarChart data={d.chart_data} />
          </Panel>
        </div>

        <Panel title="Section Progress" icon="layers" bodyClass="flush">
          <div className="table-wrap">
            <table className="gov-table compact">
              <thead><tr><th>Section</th><th className="center">Not Started</th><th className="center">In Progress</th><th className="center">Submitted</th></tr></thead>
              <tbody>
                {d.section_progress.map((s) => (
                  <tr key={s.key}>
                    <td>
                      <Link to={user.section && user.section !== s.key ? "#" : `/production/sections/${s.key}`} className="fw-bold">
                        {s.label}
                      </Link>
                    </td>
                    <td className="center">{s.pending}</td>
                    <td className="center">{s.in_progress}</td>
                    <td className="center"><span className="badge green">{s.submitted}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
