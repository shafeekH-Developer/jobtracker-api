import Icon from "./Icons.jsx";
import { STATUSES, formatDate, safeLink, daysFromToday, relativeDay } from "./utils.js";

export default function ListView({ apps, filter, setFilter, counts, onOpen, onStatusChange, onDelete }) {
  return (
    <>
      <div className="filter-chips">
        {["All", ...STATUSES].map((s) => (
          <button
            key={s}
            className={`filter-chip ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s} <span>{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {apps.length === 0 ? (
        <p className="muted center">Nothing matches this filter.</p>
      ) : (
        <ul className="list">
          {apps.map((a) => {
            const iv = daysFromToday(a.interview_date);
            return (
              <li key={a.id} className="row" onClick={() => onOpen(a)}>
                <div className="row-main">
                  <div className="company">{a.company}</div>
                  <div className="role">{a.role}</div>
                  <div className="chips">
                    {a.job_type && <span className="chip">{a.job_type}</span>}
                    {a.location && (
                      <span className="chip">
                        <Icon name="pin" size={12} /> {a.location}
                      </span>
                    )}
                    {a.salary && (
                      <span className="chip">
                        <Icon name="money" size={12} /> {a.salary}
                      </span>
                    )}
                    {iv !== null && iv >= 0 && (
                      <span className="chip chip-accent">
                        <Icon name="calendar" size={12} /> Interview {relativeDay(iv).toLowerCase()}
                      </span>
                    )}
                  </div>
                  {a.notes && <div className="notes">{a.notes}</div>}
                </div>
                <div className="row-meta" onClick={(e) => e.stopPropagation()}>
                  <select
                    className={`status-select s-${a.status.toLowerCase()}`}
                    value={a.status}
                    onChange={(e) => onStatusChange(a, e.target.value)}
                    aria-label={`Status for ${a.company}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <span className="date">Applied {formatDate(a.applied_date)}</span>
                </div>
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {safeLink(a.job_link) && (
                    <a className="btn btn-sm" href={safeLink(a.job_link)} target="_blank" rel="noreferrer">
                      <Icon name="link" size={14} /> Job
                    </a>
                  )}
                  <button className="btn btn-sm" onClick={() => onOpen(a)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => onDelete(a)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
