import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { fmtMoney, fmtDate } from "../../utils";
import Icon from "../../components/Icon";
import { EmptyState, PageHead, Panel, BarChart } from "../../components/ui";

export default function FinanceDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/finance/dashboard").then((r) => setData(r.data)).catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div className="alert error"><Icon name="alert" /><span>{err}</span></div>;
  if (!data) return <div className="empty-state"><div className="es-sub">Loading…</div></div>;

  const cards = [
    { href: "/finance/work-orders?view=pending", cls: "c-amber", icon: "clock", value: data.pending, label: "Pending Cost Sheets", hint: "Verified by R&M — awaiting costing" },
    { href: "/finance/work-orders?view=pending", cls: "c-violet", icon: "save", value: data.draft_costs, label: "Drafts Saved", hint: "Costing started, not submitted" },
    { href: "/finance/work-orders?view=issued", cls: "c-green", icon: "check-circle", value: data.finalized, label: "Cost Sheets Issued", hint: "Submitted to R&M / completed" },
    { href: "/finance/work-orders", cls: "c-gold", icon: "rupee", value: fmtMoney(data.total_value), small: true, label: "Total Billed Value", hint: "Issued cost sheets (incl. GST)" },
  ];

  return (
    <div>
      <PageHead breadcrumb="Finance Department / Dashboard"
        title="Finance Department Dashboard"
        sub="Issue cost sheet numbers and consolidated costing with GST components" />

      <div className="stat-grid">
        {cards.map((c) => (
          <Link key={c.label} className={`stat-card ${c.cls}`} to={c.href}>
            <span className="sc-icon"><Icon name={c.icon} /></span>
            <span>
              <span className="sc-value" style={c.small ? { fontSize: 19 } : {}}>{c.value}</span><br />
              <span className="sc-label">{c.label}</span>
              <div className="sc-hint">{c.hint}</div>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid-2">
        <Panel title="Costing Queue — Pending" icon="clipboard"
          right={<Link className="btn btn-ghost btn-sm" to="/finance/work-orders?view=pending">Full Queue <Icon name="arrow-right" cls="btn-icon" /></Link>}>
          <div className="table-wrap">
            <table className="gov-table compact">
              <thead><tr><th>W.O. No.</th><th>Customer</th><th>Equipment</th><th className="num">Parts</th><th className="num">Labour</th><th></th></tr></thead>
              <tbody>
                {(data.queue || []).map((w) => (
                  <tr key={w._id}>
                    <td><span className="wo-num">{w.wo_number}</span></td>
                    <td>{w.customer_name}</td>
                    <td className="center">{w.equipment_count}</td>
                    <td className="num">{fmtMoney(w.parts_total)}</td>
                    <td className="num">{fmtMoney(w.labour_total)}</td>
                    <td className="text-right">
                      <Link className="btn btn-primary btn-xs" to={`/finance/work-orders/${w._id}`}>Prepare Cost Sheet <Icon name="arrow-right" /></Link>
                    </td>
                  </tr>
                ))}
                {!data.queue?.length && (
                  <tr><td colSpan={6}><EmptyState title="No pending cost sheets" sub="Verified work orders will appear here." icon="check-circle" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <div>
          <Panel title="Financial Summary" icon="chart">
            <BarChart data={data.chart_data || []} />
          </Panel>

          <Panel title="Recently Issued Cost Sheets" icon="clock">
            <div className="table-wrap">
              <table className="gov-table compact">
                <thead><tr><th>Cost Sheet</th><th>W.O. No.</th><th className="num">Total Amount</th><th></th></tr></thead>
                <tbody>
                  {(data.recent_costs || []).map((c) => (
                    <tr key={c._id}>
                      <td className="fw-bold">{c.cost_sheet_no || "—"}<div className="small text-muted">{c.cost_sheet_date ? fmtDate(c.cost_sheet_date) : ""}</div></td>
                      <td><span className="wo-num">{c.wo_number}</span></td>
                      <td className="num fw-bold">{fmtMoney(c.total_amount)}</td>
                      <td className="text-right">
                        <Link className="btn btn-ghost btn-xs" to={`/finance/work-orders/${c.wo_id}`}><Icon name="eye" /></Link>
                      </td>
                    </tr>
                  ))}
                  {!data.recent_costs?.length && (
                    <tr><td colSpan={4}><EmptyState title="No cost sheets issued yet" icon="rupee" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
