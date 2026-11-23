import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import ApplicationForm from "./ApplicationForm.jsx";
import Board from "./Board.jsx";
import ListView from "./ListView.jsx";
import Insights from "./Insights.jsx";
import Reminders from "./Reminders.jsx";
import Icon from "./Icons.jsx";
import { STATUSES, applicationsToCsv, downloadFile, todayStr } from "./utils.js";

const VIEW_KEY = "jobtracker_view";
const ZOOM_KEY = "jobtracker_zoom";
const ZOOM_STEPS = [1, 1.15, 1.3, 1.5];

function initialZoom() {
  try {
    const saved = Number(localStorage.getItem(ZOOM_KEY));
    if (ZOOM_STEPS.includes(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  return 1;
}

function initialView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (["board", "list", "insights"].includes(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  return "board";
}

export default function Dashboard({ onLogout, theme, onToggleTheme }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | { application?, status? }
  const [zoom, setZoom] = useState(initialZoom);

  function changeZoom(direction) {
    const index = ZOOM_STEPS.indexOf(zoom) + direction;
    if (index < 0 || index >= ZOOM_STEPS.length) return;
    const next = ZOOM_STEPS[index];
    setZoom(next);
    try {
      localStorage.setItem(ZOOM_KEY, String(next));
    } catch {
      /* storage blocked */
    }
  }

  function resetZoom() {
    setZoom(1);
    try {
      localStorage.setItem(ZOOM_KEY, "1");
    } catch {
      /* storage blocked */
    }
  }

  // Zoom only applies to the Board and List views, never to Insights.
  const zoomed = view !== "insights";

  function changeView(next) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* storage blocked */
    }
  }

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

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) =>
      [a.company, a.role, a.location, a.contact_name].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [apps, search]);

  const listItems = useMemo(
    () => (filter === "All" ? searched : searched.filter((a) => a.status === filter)),
    [searched, filter]
  );

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
      setModal(null);
    } catch (err) {
      handleError(err);
    }
  }

  function exportCsv() {
    downloadFile(`job-applications-${todayStr()}.csv`, applicationsToCsv(apps));
  }

  const tabs = [
    ["board", "Board", "board"],
    ["list", "List", "list"],
    ["insights", "Insights", "chart"],
  ];

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">J</span> <span className="brand-text">JobTracker</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Icon name="plus" size={16} /> <span className="hide-sm">Add application</span>
            <span className="show-sm">Add</span>
          </button>
          <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle dark mode" title="Dark mode">
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <button className="icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main
        className={`container ${zoomed ? "zoomed" : ""}`}
        style={zoomed ? { "--zoom": zoom } : undefined}
      >
        <div className="hero-row">
          <div>
            <h1 className="title">Your job hunt</h1>
            <p className="muted">
              {apps.length === 0
                ? "Add your first application to get started."
                : `${apps.length} application${apps.length === 1 ? "" : "s"} tracked · ${counts.Interview} in interview · ${counts.Offer} offer${counts.Offer === 1 ? "" : "s"}`}
            </p>
          </div>
          <button className="btn" onClick={exportCsv} disabled={apps.length === 0}>
            <Icon name="download" size={16} /> Export CSV
          </button>
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
          <div className="loading">
            <div className="spinner" /> Loading your applications...
            <small>The first load can take up to a minute while the free server wakes up.</small>
          </div>
        ) : apps.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <Icon name="briefcase" size={30} />
            </div>
            <h3>No applications yet</h3>
            <p className="muted">Add the first job you applied for and track it from here.</p>
            <button className="btn btn-primary" onClick={() => setModal({})}>
              <Icon name="plus" size={16} /> Add application
            </button>
          </div>
        ) : (
          <>
            <Reminders apps={apps} onOpen={(app) => setModal({ application: app })} />

            <div className="toolbar">
              <div className="tabs" role="tablist">
                {tabs.map(([id, label, icon]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={view === id}
                    className={`tab ${view === id ? "active" : ""}`}
                    onClick={() => changeView(id)}
                  >
                    <Icon name={icon} size={16} /> {label}
                  </button>
                ))}
              </div>
              {view !== "insights" && (
                <div className="toolbar-right">
                  <div className="zoom-ctl" role="group" aria-label="Zoom">
                    <button
                      className="zoom-btn"
                      onClick={() => changeZoom(-1)}
                      disabled={zoom === ZOOM_STEPS[0]}
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                    <button className="zoom-val" onClick={resetZoom} title="Reset zoom">
                      {Math.round(zoom * 100)}%
                    </button>
                    <button
                      className="zoom-btn"
                      onClick={() => changeZoom(1)}
                      disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                  </div>
                  <div className="search-wrap">
                    <Icon name="search" size={16} />
                    <input
                      className="search"
                      type="search"
                      placeholder="Search company, role or location..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={zoomed ? "zoomable" : undefined}>
            {view === "board" && (
              <Board
                apps={searched}
                onOpen={(app) => setModal({ application: app })}
                onStatusChange={handleStatusChange}
                onAdd={(status) => setModal({ status })}
              />
            )}
            {view === "list" && (
              <ListView
                apps={listItems}
                filter={filter}
                setFilter={setFilter}
                counts={counts}
                onOpen={(app) => setModal({ application: app })}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            )}
            </div>
            {view === "insights" && <Insights apps={apps} />}
          </>
        )}
      </main>

      {modal && (
        <ApplicationForm
          key={modal.application ? modal.application.id : `new-${modal.status || ""}`}
          application={modal.application || (modal.status ? { status: modal.status } : null)}
          isNew={!modal.application}
          onSave={handleSave}
          onDelete={() => handleDelete(modal.application)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
