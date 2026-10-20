import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api.js";
import Icon from "../components/Icon.jsx";
import { PageHead, Panel, StatusBadge, EmptyState } from "../components/ui.jsx";
import { fmtMoney, fmtDate } from "../utils.js";
import { useAuth, ROLE_HOME } from "../auth.jsx";

export default function SearchPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [data, setData] = useState({ q, work_orders: [], parts: [] });

  useEffect(() => {
    if (q) api.get("/search", { params: { q } }).then(({ data }) => setData(data));
    else setData({ q, work_orders: [], parts: [] });
  }, [q]);

  const woBase = ROLE_HOME[user.role];
  const woLink = (id) => `${woBase}/work-orders/${id}`;

  return (
    <>
      <PageHead
        breadcrumb="Global Search"
        title="Search Results"
        sub={
          q
            ? `Query: “${q}” — ${data.work_orders.length} work order(s)${data.parts.length ? `, ${data.parts.length} inventory item(s)` : ""}`
            : "Enter a search term in the top bar."
        }
      />
      {!q ? (
        <Panel>
          <EmptyState
            title="Start searching"
            sub="Search by work order number, customer, reference, serial number, store code or part description."
            icon="search"
          />
        </Panel>
      ) : (
        <>
          <Panel title={`Work Orders (${data.work_orders.length})`} icon="clipboard" bodyClass="flush">
            <div className="table-wrap">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>W.O. No.</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Reference No.</th>
                    <th>Stage</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.work_orders.map((w) => (
                    <tr key={w._id}>
                      <td>
                        <span className="wo-num">{w.wo_number}</span>
                      </td>
                      <td>{fmtDate(w.wo_date)}</td>
                      <td>{w.customer_name}</td>
                      <td className="small">{w.reference_number || "—"}</td>
                      <td>
                        <StatusBadge status={w.status} />
                      </td>
                      <td className="text-right">
                        <Link className="btn btn-ghost btn-xs" to={woLink(w._id)}>
                          <Icon name="eye" /> Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!data.work_orders.length && (
                    <tr>
                      <td colSpan="6">
                        <EmptyState title="No matching work orders" icon="clipboard" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {data.parts.length > 0 && (
            <Panel title={`Inventory Items (${data.parts.length})`} icon="box" bodyClass="flush">
              <div className="table-wrap">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Store Code</th>
                      <th>Description</th>
                      <th>Unit</th>
                      <th className="num">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.parts.map((p) => (
                      <tr key={p._id}>
                        <td className="fw-bold">{p.store_code}</td>
                        <td>{p.description}</td>
                        <td>{p.unit}</td>
                        <td className="num">{p.unit_price !== undefined ? fmtMoney(p.unit_price) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
