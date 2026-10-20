import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api.js";
import Icon from "../../components/Icon.jsx";
import { PageHead, Panel, Pager, EmptyState } from "../../components/ui.jsx";
import { fmtMoney } from "../../utils.js";

export default function NrtcInventory() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [currency, setCurrency] = useState("Rs.");

  useEffect(() => {
    api.get("/settings").then(({ data }) => setCurrency(data.settings.currency || "Rs."));
  }, []);

  useEffect(() => {
    api.get("/nrtc/inventory", { params: { q, page } }).then(({ data }) => setData(data));
  }, [q, page]);

  return (
    <>
      <PageHead
        breadcrumb={<Link to="/nrtc">Dashboard</Link>}
        title="Item Master — Inventory"
        sub={`${data.total} item(s) in the store master`}
        actions={
          <>
            <a className="btn btn-outline" href="/api/nrtc/inventory/export.xlsx">
              <Icon name="download" cls="btn-icon" /> Export Excel
            </a>
            <Link className="btn btn-primary" to="/nrtc/inventory/import">
              <Icon name="upload" cls="btn-icon" /> Import Excel
            </Link>
          </>
        }
      />
      <Panel
        title="Inventory Items"
        icon="box"
        right={
          <form
            className="flex gap-1"
            style={{ margin: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
            }}
          >
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search store code or description…"
              style={{ height: 34, border: "1px solid var(--gov-line)", borderRadius: 6, padding: "0 12px", width: 280, fontSize: 13 }}
            />
            <button className="btn btn-outline btn-sm" type="submit">
              <Icon name="search" /> Search
            </button>
          </form>
        }
        bodyClass="flush"
      >
        <div className="table-wrap">
          <table className="gov-table">
            <thead>
              <tr><th>Store Code</th><th>Description</th><th>Unit</th><th className="num">Unit Price</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it._id}>
                  <td className="fw-bold" style={{ color: "var(--gov-blue-deep)" }}>{it.store_code}</td>
                  <td>{it.description}</td>
                  <td>{it.unit}</td>
                  <td className="num">{fmtMoney(it.unit_price, currency)}</td>
                  <td className="small text-muted">{it.updated_at ? new Date(it.updated_at).toLocaleDateString("en-GB") : "—"}</td>
                </tr>
              ))}
              {!data.items.length && (
                <tr><td colSpan="5"><EmptyState title="No items found" sub="Import the item master from Excel." icon="box" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "0 12px 10px" }}>
          <Pager page={page} pages={data.pages} total={data.total} onPage={setPage} />
        </div>
      </Panel>
    </>
  );
}
