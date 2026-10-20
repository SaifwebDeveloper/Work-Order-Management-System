import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import Icon from "../components/Icon.jsx";
import { PageHead, Panel, EmptyState } from "../components/ui.jsx";

export default function NotificationsPage() {
  const [data, setData] = useState({ unread: 0, items: [] });

  async function load() {
    const { data } = await api.get("/notifications");
    setData(data);
  }
  useEffect(() => {
    load();
  }, []);

  async function readAll() {
    await api.post("/notifications/read-all");
    load();
  }

  return (
    <>
      <PageHead
        breadcrumb={<Link to="/">Home</Link>}
        title="Notifications"
        sub={`${data.unread} unread · ${data.items.length} total`}
      />
      <Panel
        title="Inbox"
        icon="bell"
        right={
          data.unread > 0 && (
            <button className="btn btn-outline btn-sm" onClick={readAll}>
              <Icon name="check-circle" cls="btn-icon" /> Mark All as Read
            </button>
          )
        }
        bodyClass="flush"
      >
        {data.items.length ? (
          data.items.map((n) => (
            <div className={`notif-item ${n.is_read ? "read" : "unread"}`} key={n._id}>
              <span className="ni-dot"></span>
              <div className="ni-body">
                <div className="ni-title">{n.title}</div>
                <div className="ni-msg">{n.message}</div>
                <div className="ni-time">{n.created_at}</div>
              </div>
              {n.link && (
                <Link className="btn btn-ghost btn-xs" to={n.link}>
                  Open <Icon name="arrow-right" />
                </Link>
              )}
            </div>
          ))
        ) : (
          <EmptyState title="No notifications" sub="Workflow alerts will appear here." icon="bell" />
        )}
      </Panel>
    </>
  );
}
