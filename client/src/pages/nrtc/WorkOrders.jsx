import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, Pager } from "../../components/ui.jsx";
import WorkOrderTable from "../../components/WorkOrderTable.jsx";
import { STATUS_LABELS } from "../../utils.js";

export default function NrtcWorkOrders() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const status = params.get("status") || "";
  const page = parseInt(params.get("page"), 10) || 1;
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    api
      .get("/nrtc/work-orders", { params: { q, status, page } })
      .then(({ data }) => setData(data));
  }, [q, status, page]);

  function update(updates) {
    const next = { q, status, page: 1, ...updates };
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.status) sp.set("status", next.status);
    if (next.page > 1) sp.set("page", next.page);
    setParams(sp);
  }

  const filterBtn = (key, label) => (
    <button
      className={`btn btn-sm ${(status || "") === key ? "btn-primary" : "btn-outline"}`}
      onClick={() => update({ status: key })}
      key={key || "all"}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageHead
        breadcrumb="Work Orders / Register"
        title="Work Order Register"
        sub={`${data.total} record(s) found`}
        actions={
          <Link className="btn btn-gold" to="/nrtc/create">
            <Icon name="plus" cls="btn-icon" /> Create Work Order
          </Link>
        }
      />
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
          {filterBtn("", "All")}
          {Object.entries(STATUS_LABELS).map(([key, label]) => filterBtn(key, label))}
        </div>
      </Panel>
      <Panel bodyClass="flush">
        <WorkOrderTable viewer="nrtc" items={data.items} />
        <div style={{ padding: "0 12px 10px" }}>
          <Pager page={page} pages={data.pages} total={data.total} onPage={(p) => update({ page: p })} />
        </div>
      </Panel>
    </>
  );
}
