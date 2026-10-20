import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api";
import { SECTION_LABELS, STATUS_LABELS, fmtMoney, fmtQty, fmtDate } from "../../utils";
import Icon from "../../components/Icon";
import { EmptyState, PageHead, Panel, StatusBadge, PartAutocomplete } from "../../components/ui";

function ItemAddRow({ woId, section, equipmentId, showPrices, onDone }) {
  const [fault, setFault] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      await api.post(`/production/work-orders/${woId}/items`, {
        section, equipment_id: equipmentId,
        fault, store_code: storeCode, qty, remarks,
      });
      setFault(""); setStoreCode(""); setDesc(""); setQty(""); setPrice(""); setUnit(""); setRemarks("");
      onDone();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {err && <tr><td colSpan={showPrices ? 7 : 5}><span className="text-red small">{err}</span></td></tr>}
      <tr>
        <td><input type="text" value={fault} onChange={(e) => setFault(e.target.value)} placeholder="Fault / repair" /></td>
        <td><input type="text" value={desc} readOnly placeholder="Auto-filled from store code" style={{ background: "#F3F6F4" }} /></td>
        <td><input type="number" step="0.01" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></td>
        <td>
          <PartAutocomplete
            value={storeCode}
            onChange={setStoreCode}
            onPick={(p) => { setStoreCode(p.store_code); setDesc(p.description || ""); setUnit(p.unit || ""); if (p.unit_price !== undefined) setPrice(String(p.unit_price)); }}
          />
        </td>
        {showPrices && (
          <>
            <td><input type="number" step="0.01" value={price} readOnly placeholder="0.00" style={{ background: "#F3F6F4" }} /></td>
            <td className="pt-amount" style={{ fontWeight: 700 }}>{fmtMoney((parseFloat(qty) || 0) * (parseFloat(price) || 0))}</td>
          </>
        )}
        <td><input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks" /></td>
        <td className="text-center">
          <button className="btn btn-primary btn-xs" onClick={submit} disabled={busy} title="Add entry" style={{ height: 33 }}>
            <Icon name="plus" />
          </button>
        </td>
      </tr>
    </>
  );
}

function LabourAddRow({ woId, section, showPrices, onDone }) {
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      await api.post(`/production/work-orders/${woId}/labour`, { section, description, hours, rate, remarks });
      setDescription(""); setHours(""); setRate(""); setRemarks("");
      onDone();
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {err && <tr><td colSpan={showPrices ? 5 : 3}><span className="text-red small">{err}</span></td></tr>}
      <tr>
        <td><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Alternator rewinding & assembly" /></td>
        <td><input type="number" step="0.5" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" /></td>
        {showPrices && (
          <>
            <td><input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" /></td>
            <td className="pt-amount" style={{ fontWeight: 700 }}>{fmtMoney((parseFloat(hours) || 0) * (parseFloat(rate) || 0))}</td>
          </>
        )}
        <td><input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks" /></td>
        <td className="text-center">
          <button className="btn btn-primary btn-xs" onClick={submit} disabled={busy} title="Add labour entry" style={{ height: 33 }}>
            <Icon name="plus" />
          </button>
        </td>
      </tr>
    </>
  );
}

export default function ProductionWorkOrderDetail() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");

  const load = useCallback(() => {
    api.get(`/production/work-orders/${id}`).then((r) => setBundle(r.data)).catch((e) => setErr(e.response?.data?.error || e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (err) return <div className="alert error"><Icon name="alert" /><span>{err}</span></div>;
  if (!bundle) return <div className="empty-state"><div className="es-sub">Loading…</div></div>;

  const { wo, equipment, endorsement, sections, equipment_items, labour_by_section, timeline } = bundle;
  const editable = bundle.editable;
  const showPrices = bundle.show_prices;

  async function removeItem(itemId) {
    if (!window.confirm("Remove this entry?")) return;
    try { await api.delete(`/production/items/${itemId}`); load(); }
    catch (ex) { setFlash(ex.response?.data?.error || ex.message); }
  }
  async function removeLabour(labourId) {
    if (!window.confirm("Remove this labour entry?")) return;
    try { await api.delete(`/production/labour/${labourId}`); load(); }
    catch (ex) { setFlash(ex.response?.data?.error || ex.message); }
  }
  async function submitSection(section) {
    if (!window.confirm("Submit this section? After submission the entries will be locked and cannot be edited.")) return;
    try {
      await api.post(`/production/work-orders/${id}/submit-section`, { section });
      setFlash("Section submitted to R&M.");
      load();
    } catch (ex) { setFlash(ex.response?.data?.error || ex.message); }
  }

  return (
    <div>
      <PageHead
        breadcrumb={<span><Link to="/production">Dashboard</Link> / <Link to="/production/work-orders">Work Orders</Link> / {wo.wo_number}</span>}
        title={<span>Work Order <span className="text-red">#{wo.wo_number}</span></span>}
        sub={`${wo.customer_name} · ${equipment.length} equipment · Reported defects from R&M below`}
        actions={
          <>
            <StatusBadge status={wo.status} />
            <Link className="btn btn-outline" to={`/print/wo/${id}`} target="_blank"><Icon name="printer" cls="btn-icon" /> Print</Link>
          </>
        } />

      <Panel title="Endorsed Work Order Information" icon="file"
        right={
          <>
            <span className="pill">Ref: {wo.reference_number || "—"}</span>
            {endorsement && endorsement.p3c_ref_number && <span className="pill gold">P3&amp;C Ref: {endorsement.p3c_ref_number}</span>}
            <span className={`badge ${wo.under_warranty ? "green" : "gray"}`}>{wo.under_warranty ? "Under Warranty" : "Paid"}</span>
          </>
        }>
        <div className="detail-grid">
          <div className="dg-item"><div className="dg-label">Work Order No.</div><div className="dg-value big-red">{wo.wo_number}</div></div>
          <div className="dg-item"><div className="dg-label">Work Order Date</div><div className="dg-value">{fmtDate(wo.wo_date)}</div></div>
          <div className="dg-item"><div className="dg-label">Customer</div><div className="dg-value">{wo.customer_name}</div></div>
          <div className="dg-item"><div className="dg-label">Contract No.</div><div className="dg-value">{wo.contract_number || "—"}</div></div>
        </div>
      </Panel>

      {flash && <div className="alert info mb-2"><Icon name="info" /><span>{flash}</span></div>}

      {!editable && (
        <div className="alert info mb-2"><Icon name="info" />
          <span>This work order is no longer open for entry (current stage: <b>{STATUS_LABELS[wo.status] || wo.status}</b>). Entries are shown read-only.</span>
        </div>
      )}

      {sections.map((sec) => {
        const locked = sec.status === "submitted";
        const labourRows = labour_by_section[sec.section] || [];
        return (
          <Panel key={sec.section}
            title={<span><Icon name="gear-tool" /> {SECTION_LABELS[sec.section] || sec.section}</span>}
            style={{ borderLeft: `4px solid ${locked ? "#16A34A" : "var(--gov-gold)"}` }}
            right={
              <>
                <span className={`badge ${locked ? "green" : sec.status === "in_progress" ? "blue" : "amber"}`}>
                  {locked ? "Submitted" : sec.status === "in_progress" ? "In Progress" : "Not Started"}
                </span>
                {sec.submitter_name && <span className="pill muted">by {sec.submitter_name}</span>}
                {locked && <span className="pill muted">Locked</span>}
              </>
            }>

            <div className="form-section-title"><span className="fs-num">1</span> Fault &amp; Parts Used — Repair Details per Equipment</div>
            {!showPrices && (
              <div className="alert info mb-2" style={{ padding: "8px 12px" }}><Icon name="info" />
                <span className="small">Unit Price and Amount columns are hidden for technician accounts. Rates are applied automatically from the store master.</span>
              </div>
            )}

            {equipment.map((e, idx) => {
              const rows = (equipment_items[String(e._id)] || []).filter((it) => it.section === sec.section);
              return (
                <div className="equipment-card" key={e._id}>
                  <div className="ec-head">
                    <span className="ec-seq">{idx + 1}</span>
                    <span className="ec-name">{e.name}</span>
                    <span className="ml-auto pill gold">Serial: {e.serial_number || "—"}</span>
                    {e.defect && <span className="pill muted">Reported: {e.defect}</span>}
                  </div>

                  <div className="table-wrap mt-1">
                    <table className="parts-entry-table">
                      <thead>
                        <tr>
                          <th style={{ width: "19%" }}>Fault</th>
                          <th style={{ width: "24%" }}>Parts Used</th>
                          <th style={{ width: "8%" }}>Qty</th>
                          <th style={{ width: "14%" }}>Store Code</th>
                          {showPrices && <th style={{ width: "12%" }}>Unit Price</th>}
                          {showPrices && <th style={{ width: "12%" }}>Amount</th>}
                          <th style={{ width: "13%" }}>Remarks</th>
                          {editable && !locked && <th style={{ width: 44 }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((it) => (
                          <tr key={it._id}>
                            <td>{it.fault || "—"}</td>
                            <td>{it.part_description || "—"}</td>
                            <td>{fmtQty(it.qty)} {it.unit || ""}</td>
                            <td><span className="fw-bold">{it.store_code || "—"}</span></td>
                            {showPrices && <td className="pt-amount">{fmtMoney(it.unit_price)}</td>}
                            {showPrices && <td className="pt-amount">{fmtMoney(it.amount)}</td>}
                            <td className="small">{it.remarks || "—"}</td>
                            {editable && !locked && (
                              <td>
                                <button className="btn btn-ghost btn-xs" style={{ color: "#B91C1C" }} onClick={() => removeItem(it._id)} title="Remove">
                                  <Icon name="trash" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {editable && !locked && (
                          <ItemAddRow woId={id} section={sec.section} equipmentId={e._id} showPrices={showPrices} onDone={load} />
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <div className="form-section-title mt-2"><span className="fs-num">2</span> Labour Hours Charges</div>
            <div className="table-wrap">
              <table className="parts-entry-table">
                <thead>
                  <tr>
                    <th style={{ width: "38%" }}>Work Description</th>
                    <th style={{ width: "12%" }}>Hours</th>
                    {showPrices && <th style={{ width: "16%" }}>Rate / Hour</th>}
                    {showPrices && <th style={{ width: "16%" }}>Amount</th>}
                    <th>Remarks</th>
                    {editable && !locked && <th style={{ width: 44 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {labourRows.map((l) => (
                    <tr key={l._id}>
                      <td>{l.description}</td>
                      <td>{fmtQty(l.hours)} hrs</td>
                      {showPrices && <td className="pt-amount">{fmtMoney(l.rate)}</td>}
                      {showPrices && <td className="pt-amount">{fmtMoney(l.amount)}</td>}
                      <td className="small">{l.remarks || "—"}</td>
                      {editable && !locked && (
                        <td>
                          <button className="btn btn-ghost btn-xs" style={{ color: "#B91C1C" }} onClick={() => removeLabour(l._id)} title="Remove">
                            <Icon name="trash" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {editable && !locked && (
                    <LabourAddRow woId={id} section={sec.section} showPrices={showPrices} onDone={load} />
                  )}
                </tbody>
              </table>
            </div>

            {editable && !locked && (
              <div className="mt-3" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className="btn btn-primary" onClick={() => submitSection(sec.section)}>
                  <Icon name="send" cls="btn-icon" /> Save &amp; Submit Section to R&amp;M
                </button>
                <span className="help-text ml-auto">When all sections submit, the work order automatically returns to the R&amp;M Department.</span>
              </div>
            )}
          </Panel>
        );
      })}

      <Panel title="Work Order Trail" icon="clock">
        <div className="timeline">
          {timeline.map((t, i) => (
            <div key={t._id || i} className={`tl-item ${t.stage === "production" ? "tl-green" : ""}`}>
              <div className="tl-action">{t.action}</div>
              <div className="tl-meta">{t.actor_name || "System"} · {t.created_at}</div>
              {t.notes && <div className="tl-notes">{t.notes}</div>}
            </div>
          ))}
          {!timeline.length && <EmptyState title="No activity yet" icon="clock" />}
        </div>
      </Panel>
    </div>
  );
}
