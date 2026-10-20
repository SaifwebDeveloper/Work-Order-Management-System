import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api, { downloadFile } from "../../api";
import { fmtDate } from "../../utils";
import Icon from "../../components/Icon";
import { EmptyState, PageHead, Panel } from "../../components/ui";

export default function GatepassList() {
  const [q, setQ] = useState("");
  const [data, setData] = useState({ items: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/gatepass", { params: { q: q || undefined } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, [q]);

  return (
    <div>
      <PageHead breadcrumb={<span><Link to="/">Home</Link> / Gate Passes</span>}
        title="Gate Pass Register"
        sub="All material movement passes issued against completed work orders" />

      <Panel title={`Issued Gate Passes (${data.total || 0})`} icon="truck"
        right={
          <form className="flex gap-1" style={{ margin: 0 }} onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="Search GP no / W.O. no / recipient…" value={q} onChange={(e) => setQ(e.target.value)}
              style={{ height: 34, border: "1px solid var(--gov-line)", borderRadius: 6, padding: "0 12px", width: 290, fontSize: 13 }} />
            <button className="btn btn-outline btn-sm" type="submit"><Icon name="search" /> Search</button>
          </form>
        }>
        {err && <div className="alert error"><Icon name="alert" /><span>{err}</span></div>}
        <div className="table-wrap">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Gate Pass No.</th><th>Date</th><th>W.O. No.</th><th>Issued To</th>
                <th>Vehicle No.</th><th>Type</th><th className="center">Items</th><th>Issued By</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((gp) => (
                <tr key={gp._id}>
                  <td className="fw-bold" style={{ color: "var(--gov-blue-deep)" }}>{gp.gp_number}</td>
                  <td>{fmtDate(gp.created_at)}</td>
                  <td><span className="wo-num">{gp.wo_number}</span></td>
                  <td>{gp.issued_to}{gp.designation && <div className="small text-muted">{gp.designation}</div>}</td>
                  <td>{gp.vehicle_no || "—"}</td>
                  <td><span className={`badge ${gp.returnable ? "green" : "amber"}`}>{gp.returnable ? "Returnable" : "Non-Returnable"}</span></td>
                  <td className="center">{gp.item_count}</td>
                  <td className="small">{gp.issuer_name || "—"}</td>
                  <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                    <Link className="btn btn-ghost btn-xs" to={`/gatepasses/${gp._id}`}><Icon name="eye" /></Link>
                    <button className="btn btn-ghost btn-xs" title="PDF" onClick={() => downloadFile(`/gatepass/${gp._id}/pdf`, `${gp.gp_number}.pdf`)}><Icon name="download" /></button>
                    <button className="btn btn-ghost btn-xs" title="Excel" onClick={() => downloadFile(`/gatepass/${gp._id}/xlsx`, `${gp.gp_number}.xlsx`)}><Icon name="file" /></button>
                  </td>
                </tr>
              ))}
              {!data.items?.length && (
                <tr><td colSpan={9}><EmptyState title="No gate passes issued yet" sub="Gate passes are issued from completed work orders." icon="truck" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
