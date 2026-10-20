import { useEffect, useState } from "react";
import api from "../api.js";
import Icon from "../components/Icon.jsx";
import { PageHead, Panel, EmptyState } from "../components/ui.jsx";
import { ROLES } from "../utils.js";
import { useAuth } from "../auth.jsx";

export default function UsersPage() {
  const { user } = useAuth();
  const [dept, setDept] = useState(user.role === "nrtc_admin" ? "" : user.role);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/users", { params: dept ? { dept } : {} }).then(({ data }) => setRows(data));
  }, [dept]);

  return (
    <>
      <PageHead breadcrumb="General / Directory" title="Users Directory" sub={`${rows.length} account(s)`} />
      <Panel
        title="Department Users"
        icon="users"
        right={
          user.role === "nrtc_admin" ? (
            <div className="flex gap-1">
              <button className={`btn btn-sm ${!dept ? "btn-primary" : "btn-outline"}`} onClick={() => setDept("")}>
                All
              </button>
              {Object.keys(ROLES).map((r) => (
                <button
                  className={`btn btn-sm ${dept === r ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setDept(r)}
                  key={r}
                >
                  {ROLES[r].replace(" Department", "").replace(" (NRTC)", "")}
                </button>
              ))}
            </div>
          ) : null
        }
        bodyClass="flush"
      >
        <div className="table-wrap">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Department</th>
                <th>Section</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="fw-bold">{u.full_name}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className="pill">{u.role_label}</span>
                  </td>
                  <td>{u.section_label || "—"}</td>
                  <td className="small">{u.email || "—"}</td>
                  <td className="small">{u.phone || "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan="6">
                    <EmptyState title="No users found" icon="users" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
