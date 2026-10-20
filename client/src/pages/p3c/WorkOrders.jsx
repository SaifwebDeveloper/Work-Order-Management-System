import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel } from "../../components/ui.jsx";
import WorkOrderTable from "../../components/WorkOrderTable.jsx";

const VIEWS = [
  ["", "All"],
  ["new", "New Work Orders"],
  ["review", "Under Review"],
  ["verified", "Verified"],
  ["forwarded", "Forwarded"],
];

export default function P3cWorkOrders() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const view = params.get("view") || "";
  const [data, setData] = useState({ items: [], total: 0 });
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    api.get("/p3c/work-orders", { params: { q, view } }).then(({ data }) => setData(data));
  }, [q, view]);

  function update(updates) {
    const next = { q, view, ...updates };
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.view) sp.set("view", next.view);
    setParams(sp);
  }

  return (
    <>
      <PageHead breadcrumb="Work Orders / Endorsement" title="Work Orders — Endorsement" sub={`${data.total} record(s) found`} />
      <Panel
        title="Filters"
        icon="filter"
        right={
          <form
            className="flex gap-1"
            style={{ margin: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: searchInput.trim() });
            }}
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search W.O. no, customer, reference…"
              style={{ height: 34, border: "1px solid var(--gov-line)", borderRadius: 6, padding: "0 12px", width: 280, fontSize: 13 }}
            />
            <button className="btn btn-outline btn-sm" type="submit">
              <Icon name="search" /> Search
            </button>
          </form>
        }
      >
        <div className="flex gap-1 flex-wrap">
          {VIEWS.map(([key, label]) => (
            <button
              className={`btn btn-sm ${view === key ? "btn-primary" : "btn-outline"}`}
              onClick={() => update({ view: key })}
              key={key || "all"}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>
      <Panel bodyClass="flush">
        <WorkOrderTable viewer="p3c" items={data.items} />
      </Panel>
    </>
  );
}
