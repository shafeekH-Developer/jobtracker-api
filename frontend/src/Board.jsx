import { useState } from "react";
import Icon from "./Icons.jsx";
import { STATUSES, daysFromToday, formatShort, relativeDay } from "./utils.js";

function Card({ app, onOpen, onStatusChange, dragging, setDragging }) {
  const iv = daysFromToday(app.interview_date);
  const fu = daysFromToday(app.follow_up_date);
  const followDue = fu !== null && fu <= 0 && ["Wishlist", "Applied", "Interview"].includes(app.status);

  return (
    <div
      className={`card ${dragging === app.id ? "is-dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(app.id));
        e.dataTransfer.effectAllowed = "move";
        setDragging(app.id);
      }}
      onDragEnd={() => setDragging(null)}
      onClick={() => onOpen(app)}
    >
      <div className="card-top">
        <div>
          <div className="company">{app.company}</div>
          <div className="role">{app.role}</div>
        </div>
      </div>

      <div className="chips">
        {app.job_type && <span className="chip">{app.job_type}</span>}
        {app.location && (
          <span className="chip">
            <Icon name="pin" size={12} /> {app.location}
          </span>
        )}
        {app.salary && (
          <span className="chip">
            <Icon name="money" size={12} /> {app.salary}
          </span>
        )}
      </div>

      {iv !== null && iv >= 0 && (
        <div className="card-flag flag-interview">
          <Icon name="calendar" size={13} /> Interview · {formatShort(app.interview_date)} ({relativeDay(iv)})
        </div>
      )}
      {followDue && (
        <div className="card-flag flag-follow">
          <Icon name="bell" size={13} /> Follow up {fu === 0 ? "today" : "overdue"}
        </div>
      )}

      <select
        className="move-select"
        value={app.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(app, e.target.value)}
        aria-label={`Move ${app.company}`}
      >
        {STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

export default function Board({ apps, onOpen, onStatusChange, onAdd }) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  function handleDrop(e, status) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    setOver(null);
    setDragging(null);
    const app = apps.find((a) => a.id === id);
    if (app && app.status !== status) onStatusChange(app, status);
  }

  return (
    <div className="board">
      {STATUSES.map((status) => {
        const items = apps.filter((a) => a.status === status);
        return (
          <section
            key={status}
            className={`column col-${status.toLowerCase()} ${over === status ? "drop-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOver(null);
            }}
            onDrop={(e) => handleDrop(e, status)}
          >
            <header className="col-head">
              <span className="col-title">
                <span className="dot" /> {status}
              </span>
              <span className="col-count">{items.length}</span>
            </header>
            <div className="col-body">
              {items.map((a) => (
                <Card
                  key={a.id}
                  app={a}
                  onOpen={onOpen}
                  onStatusChange={onStatusChange}
                  dragging={dragging}
                  setDragging={setDragging}
                />
              ))}
              {items.length === 0 && <div className="col-empty">Drop a card here</div>}
            </div>
            <button className="col-add" onClick={() => onAdd(status)}>
              <Icon name="plus" size={14} /> Add
            </button>
          </section>
        );
      })}
    </div>
  );
}
