import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api";
import Icon from "../../components/Icon";
import { EmptyState, PageHead, Panel } from "../../components/ui";
import WorkOrderTable from "../../components/WorkOrderTable";

const VIEWS = [
  ["", "All"],
  ["pending", "Pending Cost Sheets"],
  ["issued", "Cost Sheets Issued"],
];

export default function FinanceWorkOrders() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || "";
  const [q, setQ] = useState("");
  const [data, setData] = useState({ items: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/finance/work-orders", { params: { view, q: q || undefined } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, [view, q]);

  return (
    <div>
      <PageHead breadcrumb={<span><Link to="/finance">Dashboard</Link> / Costing Queue</span>}
        title="Costing Queue"
        sub={`${data.total || 0} work order(s) in Finance stages`} />

      <Panel
        title="Work Orders"
        icon="rupee"
        right={
          <div className="flex gap-1" style={{ alignItems: "center" }}>
            <div className="filter-tabs">
              {VIEWS.map(([key, label]) => (
                <button key={key}
                  className={`ft-tab ${view === key ? "active" : ""}`}
                  onClick={() => setParams(key ? { view: key } : {})}>
                  {label}
                </button>
              ))}
            </div>
            <form className="navbar-search" style={{ minWidth: 220 }} onSubmit={(e) => e.preventDefault()}>
              <span className="search-icon"><Icon name="search" /></span>
              <input type="text" placeholder="Search customer, W.O. no…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          </div>
        }>
        {err && <div className="alert error"><Icon name="alert" /><span>{err}</span></div>}
        {data.items.length ? (
          <WorkOrderTable viewer="finance" items={data.items} />
        ) : (
          <EmptyState title="No work orders found" sub="Work orders verified by R&M will appear here for costing." icon="rupee" />
        )}
      </Panel>
    </div>
  );
}
