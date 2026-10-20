import { useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import api from "../api.js";
import { fmtMoney, CHART_COLORS, STATUS_LABELS, STATUS_COLORS, SECTION_LABELS } from "../utils.js";

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_COLORS[status] || "gray"}`}>{STATUS_LABELS[status] || status}</span>;
}

export function GpPill({ gpCount, delivered }) {
  if (delivered)
    return (
      <span className="badge green">
        <Icon name="truck" cls="btn-icon" /> Gate Pass Delivered
      </span>
    );
  if (gpCount > 0)
    return (
      <span className="badge gold">
        <Icon name="truck" cls="btn-icon" /> Gate Pass Issued
      </span>
    );
  return <span className="badge outline">No Gate Pass</span>;
}

export function EmptyState({ title, sub = "", icon = "files" }) {
  return (
    <div className="empty-state">
      <div className="es-icon">
        <Icon name={icon} cls="es-svg" />
      </div>
      <div className="es-title">{title}</div>
      {sub && <div className="es-sub">{sub}</div>}
    </div>
  );
}

export function PageHead({ breadcrumb, title, sub, actions }) {
  return (
    <div className="page-head">
      <div className="ph-text">
        {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
        <h1>{title}</h1>
        {sub && <div className="ph-sub">{sub}</div>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, icon, right, children, bodyClass = "", style }) {
  return (
    <div className="panel" style={style}>
      {(title || right) && (
        <div className="panel-head">
          <h3>
            {icon && <Icon name={icon} />} {title}
          </h3>
          {right && <div className="ph-right">{right}</div>}
        </div>
      )}
      <div className={`panel-body ${bodyClass}`}>{children}</div>
    </div>
  );
}

export function BarChart({ data, height = 250, money = false, currency = "Rs." }) {
  const maxv = Math.max(...data.map((d) => d.value), 1);
  const step = 105;
  const w = data.length * step;
  const h = height;
  const padl = 44;
  const padr = 14;
  const padt = 26;
  const padb = 34;
  if (!data.length) return <EmptyState title="No data to chart" />;
  const fmtVal = (v) => (money && v >= 1000 ? `${Math.round(v / 1000)}k` : v);
  return (
    <svg className="bar-chart" viewBox={`0 0 ${w + padl + padr} ${h}`} preserveAspectRatio="xMidYMid meet">
      {[0, 1, 2, 3, 4].map((i) => {
        const gy = padt + ((h - padt - padb) * i) / 4;
        return (
          <g key={i}>
            <line className="grid-line" x1={padl} y1={gy} x2={w + padl} y2={gy} />
            <text className="axis-text" x={padl - 8} y={gy + 4} textAnchor="end">
              {fmtVal(Math.round((maxv * (4 - i)) / 4))}
            </text>
          </g>
        );
      })}
      {data.map((d, idx) => {
        const barw = 46;
        const x = padl + idx * step + (step - barw) / 2;
        const bh = ((h - padt - padb) * d.value) / maxv;
        const y = h - padb - bh;
        const label = d.label.length <= 17 ? d.label : `${d.label.slice(0, 15)}…`;
        return (
          <g key={idx}>
            <rect
              className="bar"
              x={x}
              y={y}
              width={barw}
              height={Math.max(bh, 2)}
              rx="4"
              fill={CHART_COLORS[d.color] || "#1D5FA8"}
            >
              <title>{`${d.label}: ${money ? fmtMoney(d.value, currency) : d.value}`}</title>
            </rect>
            <text className="bar-value" x={x + barw / 2} y={y - 7} textAnchor="middle">
              {fmtVal(Math.round(d.value * 100) / 100)}
            </text>
            <text className="bar-label" x={x + barw / 2} y={h - padb + 17} textAnchor="middle">
              {label}
            </text>
          </g>
        );
      })}
      <line x1={padl} y1={h - padb} x2={w + padl} y2={h - padb} stroke="#CBD5E1" strokeWidth="1.5" />
    </svg>
  );
}

const STEPPER_STAGES = [
  "Created",
  "P3 & C Endorsement",
  "Production II",
  "R&M Verification",
  "Finance Costing",
  "Final Approval",
];

export function Stepper({ status }) {
  const currentMap = {
    draft: 0,
    pending_p3c: 1,
    pending_production: 2,
    pending_nrtc_check: 3,
    pending_finance: 4,
    pending_nrtc_final: 5,
    completed: 6,
  };
  const cur = currentMap[status] ?? 0;
  return (
    <div className="stepper">
      {STEPPER_STAGES.map((label, idx) => {
        const state = idx < cur ? "done" : idx === cur ? "current" : "";
        return (
          <div className={`step ${state}`} key={label}>
            <div className="st-dot">{state === "done" ? <Icon name="check" cls="btn-icon" /> : idx + 1}</div>
            <div className="st-label">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Pager({ page, pages, total, onPage }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let p = 1; p <= pages; p++) {
    if (p <= 2 || p > pages - 2 || (p >= page - 1 && p <= page + 1)) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <div className="pager no-print">
      <span className="pg-info">
        Showing page {page} of {pages} — {total} record(s)
      </span>
      {page > 1 ? (
        <a onClick={() => onPage(page - 1)} style={{ cursor: "pointer" }}>
          <Icon name="chevron-left" />
        </a>
      ) : (
        <span className="pg-disabled">
          <Icon name="chevron-left" />
        </span>
      )}
      {nums.map((p, i) =>
        p === "…" ? (
          <span className="pg-disabled" key={`e${i}`}>
            …
          </span>
        ) : p === page ? (
          <span className="pg-current" key={p}>
            {p}
          </span>
        ) : (
          <a onClick={() => onPage(p)} style={{ cursor: "pointer" }} key={p}>
            {p}
          </a>
        )
      )}
      {page < pages ? (
        <a onClick={() => onPage(page + 1)} style={{ cursor: "pointer" }}>
          <Icon name="chevron-right" />
        </a>
      ) : (
        <span className="pg-disabled">
          <Icon name="chevron-right" />
        </span>
      )}
    </div>
  );
}

export function SectionPills({ csv }) {
  if (!csv) return <span className="text-muted">—</span>;
  return (
    <>
      {csv.split(",").map((s) => (
        <span className="pill" key={s} style={{ marginRight: 4 }}>
          {SECTION_LABELS[s] || s}
        </span>
      ))}
    </>
  );
}

export function FileDrop({ name, accept = ".pdf,.png,.jpg,.jpeg", multiple = false, hint, text }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  return (
    <div className="file-drop" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      <div className="fd-icon">
        <Icon name="upload" />
      </div>
      <div className="fd-text">{text || "Click to attach a file"}</div>
      {hint && <div className="fd-hint">{hint}</div>}
      <div className="fd-files">
        {files.map((f) => (
          <span className="pill" key={f.name}>
            {f.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// Store-code autocomplete with debounced search against /api/parts/search.
export function PartAutocomplete({ value, onChange, onPick, style }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  function search(q) {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setList([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/parts/search", { params: { q } });
        setList(data);
        setOpen(data.length > 0);
      } catch {
        setList([]);
      }
    }, 220);
  }

  async function lookup(code) {
    if (!code.trim()) return;
    try {
      const { data } = await api.get("/parts/lookup", { params: { code } });
      if (data.found) onPick(data);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        placeholder="Search part…"
        autoComplete="off"
        style={style}
        onChange={(e) => {
          onChange(e.target.value);
          search(e.target.value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            lookup(value);
            setOpen(false);
          }
        }}
      />
      {open && (
        <div className="autocomplete-list" style={{ display: "block", position: "absolute", zIndex: 50, left: 0, right: 0, top: "100%" }}>
          {list.map((p) => (
            <div
              className="ac-item"
              key={p._id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(p.store_code);
                onPick(p);
                setOpen(false);
              }}
            >
              {p.unit_price !== undefined && <span className="ac-price">{fmtMoney(p.unit_price)}</span>}
              <span className="ac-code">{p.store_code}</span>
              <div className="ac-desc">
                {p.description}
                {p.unit ? ` — ${p.unit}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Flash({ flashes, dismiss }) {
  if (!flashes.length) return null;
  return (
    <div className="flash-stack">
      {flashes.map((f) => (
        <div className={`alert ${f.kind}`} key={f.id}>
          <Icon name={f.kind === "error" ? "alert" : "info"} />
          <span>{f.text}</span>
          <button type="button" className="alert-close" onClick={() => dismiss(f.id)}>
            <Icon name="x" />
          </button>
        </div>
      ))}
    </div>
  );
}

let flashId = 0;
export function useFlashes() {
  const [flashes, setFlashes] = useState([]);
  const push = (text, kind = "info") => {
    const id = ++flashId;
    setFlashes((fs) => [...fs, { id, text, kind }]);
    setTimeout(() => setFlashes((fs) => fs.filter((f) => f.id !== id)), 6000);
  };
  const dismiss = (id) => setFlashes((fs) => fs.filter((f) => f.id !== id));
  return { flashes, push, dismiss };
}

export { useMemo };
