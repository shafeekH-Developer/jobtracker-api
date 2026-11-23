import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import ApplicationForm, { STATUSES } from "./ApplicationForm.jsx";

function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function safeLink(url) {
  return /^https?:\/\//i.test(url || "") ? url : null;
}

export default function Dashboard({ onLogout }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | { application?: {...} }

  function handleError(err) {
    if (err.status === 401) {
      onLogout();
      return;
    }
    setError(err.message || "Something went wrong.");
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      setApps(await api.list());
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { All: apps.length };
    STATUSES.forEach((s) => (c[s] = 0));
    apps.forEach((a) => {
      c[a.status] = (c[a.status] || 0) + 1;
    });
    return c;
  }, [apps]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (filter !== "All" && a.status !== filter) return false;
      if (!q) return true;
      return a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
    });
  }, [apps, filter, search]);

  async function handleSave(data) {
    const editing = modal && modal.application;
    const saved = editing
      ? await api.update(modal.application.id, data)
      : await api.create(data);
    setApps((prev) =>
      editing ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev]
    );
    setModal(null);
  }

  async function handleStatusChange(app, status) {
    const previous = apps;
    setApps(apps.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      await api.update(app.id, { status });
    } catch (err) {
      setApps(previous);
      handleError(err);
    }
  }

  async function handleDelete(app) {
    if (!window.confirm(`Delete the ${app.company} application?`)) return;
    try {
      await api.remove(app.id);
      setApps((prev) => prev.filter((a) => a.id !== app.id));
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">J</span> JobTracker
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setModal({})}>
            + Add application
          </button>
          <button className="btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="container">
        <h1 className="title">Your applications</h1>

        <div className="stats">
          {["All", ...STATUSES].map((s) => (
            <button
              key={s}
              className={`stat ${filter === s ? "active" : ""} stat-${s.toLowerCase()}`}
              onClick={() => setFilter(s)}
            >
              <span className="stat-num">{counts[s] || 0}</span>
              <span className="stat-label">{s === "All" ? "Total" : s}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="muted">
            {visible.length} of {apps.length} shown
          </span>
        </div>

        {error && (
          <div className="error">
            {error}{" "}
            <button className="link" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <p className="muted center">Loading...</p>
        ) : apps.length === 0 ? (
          <div className="empty">
            <h3>No applications yet</h3>
            <p className="muted">Add the first job you applied for and track it from here.</p>
            <button className="btn btn-primary" onClick={() => setModal({})}>
              + Add application
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="muted center">Nothing matches this filter.</p>
        ) : (
          <ul className="list">
            {visible.map((a) => (
              <li key={a.id} className="row">
                <div className="row-main">
                  <div className="company">{a.company}</div>
                  <div className="role">{a.role}</div>
                  {a.notes && <div className="notes">{a.notes}</div>}
                </div>
                <div className="row-meta">
                  <select
                    className={`status-select s-${a.status.toLowerCase()}`}
                    value={a.status}
                    onChange={(e) => handleStatusChange(a, e.target.value)}
                    aria-label={`Status for ${a.company}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <span className="date">{formatDate(a.applied_date)}</span>
                </div>
                <div className="row-actions">
                  {safeLink(a.job_link) && (
                    <a className="btn btn-sm" href={safeLink(a.job_link)} target="_blank" rel="noreferrer">
                      Job link
                    </a>
                  )}
                  <button className="btn btn-sm" onClick={() => setModal({ application: a })}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {modal && (
        <ApplicationForm
          application={modal.application}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
