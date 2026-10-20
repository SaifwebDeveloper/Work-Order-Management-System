import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api";
import { PRODUCTION_SECTIONS, SECTION_LABELS } from "../../utils";
import Icon from "../../components/Icon";
import { EmptyState, PageHead, Panel, BarChart } from "../../components/ui";
import WorkOrderTable from "../../components/WorkOrderTable";
import { useAuth } from "../../auth";

export default function ProductionSections() {
  const { user } = useAuth();
  const { section } = useParams();
  const [dash, setDash] = useState(null);
  const [view, setView] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/production/dashboard").then((r) => setDash(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!section) { setView(null); return; }
    setView(null);
    api.get(`/production/sections/${section}`).then((r) => setView(r.data)).catch((e) => setErr(e.response?.data?.error || e.message));
  }, [section]);

  if (section) {
    const label = SECTION_LABELS[section] || section;
    const locked = user.section && user.section !== section;
    return (
      <div>
        <PageHead breadcrumb={<span><Link to="/production">Production II</Link> / <Link to="/production/sections">Sections</Link> / {label}</span>}
          title={label}
          sub={view ? `${view.summary.open_count} open · ${view.summary.total_count} total work orders in this section` : "Section detail"}
          actions={<Link className="btn btn-outline" to="/production/sections"><Icon name="arrow-left" cls="btn-icon" /> All Sections</Link>} />
        {err && <div className="alert error"><Icon name="alert" /><span>{err}</span></div>}
        {locked && <div className="alert error"><Icon name="lock" /><span>You do not have access to the {label} section.</span></div>}
        {!locked && (
          <Panel title={`Open Work Orders — ${label}`} icon="clipboard">
            {!view ? (
              <div className="empty-state"><div className="es-sub">Loading…</div></div>
            ) : view.items && view.items.length ? (
              <WorkOrderTable viewer="production" items={view.items} />
            ) : (
              <EmptyState title="No open work orders" sub={`Nothing is currently assigned to the ${label} section.`} />
            )}
          </Panel>
        )}
      </div>
    );
  }

  if (err) return <div className="alert error"><Icon name="alert" /><span>{err}</span></div>;
  if (!dash) return <div className="empty-state"><div className="es-sub">Loading…</div></div>;

  const sectionLink = (key) => (user.section && user.section !== key ? "#" : `/production/sections/${key}`);

  return (
    <div>
      <PageHead breadcrumb={<span><Link to="/production">Production II</Link> / Sections</span>}
        title="Production Sections" sub="Overview of all repair sections" />

      <div className="grid grid-3 mb-3">
        {PRODUCTION_SECTIONS.map(([key, label]) => {
          const s = (dash.section_progress || []).find((x) => x.key === key) || { open: 0, progress: 0, awaiting: 0, completed: 0 };
          const locked = user.section && user.section !== key;
          return (
            <Link key={key} to={sectionLink(key)} className="stat-card" style={locked ? { opacity: .55, pointerEvents: "none" } : {}}>
              <div className="stat-head">
                <div><div className="stat-label">{label}</div><div className="stat-sub">Section Overview</div></div>
                <div className="stat-icon mid">{locked ? <Icon name="lock" /> : <Icon name="layers" />}</div>
              </div>
              <div className="stat-value">{s.open + s.progress + s.awaiting}<small style={{ fontSize: 14, color: "var(--text-muted)" }}> open</small></div>
              <div className="stat-foot">{s.progress} in progress · {s.completed} completed</div>
            </Link>
          );
        })}
      </div>

      <Panel title="Open Work per Section" icon="chart">
        <BarChart data={PRODUCTION_SECTIONS.map(([key, label]) => [label, ((dash.section_progress || []).find((x) => x.key === key) || { open: 0 }).open, "blue"])} />
      </Panel>
    </div>
  );
}
