import { useMemo } from "react";
import { STATUSES, parseDate, todayStr } from "./utils.js";

function pct(part, whole) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

function weekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

export default function Insights({ apps }) {
  const data = useMemo(() => {
    const count = {};
    STATUSES.forEach((s) => (count[s] = 0));
    apps.forEach((a) => (count[a.status] = (count[a.status] || 0) + 1));

    // "Submitted" means anything that is not just a wishlist idea.
    const submitted = apps.length - count.Wishlist;
    const responded = count.Interview + count.Offer + count.Rejected;
    const interviews = count.Interview + count.Offer;

    // Applications per week for the last 8 weeks.
    const thisWeek = weekStart(parseDate(todayStr()));
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - i * 7);
      weeks.push({ start, count: 0 });
    }
    apps.forEach((a) => {
      const d = parseDate(a.applied_date);
      if (!d || a.status === "Wishlist") return;
      const ws = weekStart(d).getTime();
      const week = weeks.find((w) => w.start.getTime() === ws);
      if (week) week.count += 1;
    });

    return {
      count,
      submitted,
      responseRate: pct(responded, submitted),
      interviewRate: pct(interviews, submitted),
      offerRate: pct(count.Offer, submitted),
      weeks,
      maxWeek: Math.max(1, ...weeks.map((w) => w.count)),
    };
  }, [apps]);

  if (apps.length === 0) {
    return <p className="muted center">Add a few applications to see your insights.</p>;
  }

  return (
    <div className="insights">
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-num">{data.submitted}</div>
          <div className="kpi-label">Applications sent</div>
        </div>
        <div className="kpi">
          <div className="kpi-num">{data.responseRate}%</div>
          <div className="kpi-label">Response rate</div>
        </div>
        <div className="kpi">
          <div className="kpi-num">{data.interviewRate}%</div>
          <div className="kpi-label">Reached interview</div>
        </div>
        <div className="kpi">
          <div className="kpi-num">{data.offerRate}%</div>
          <div className="kpi-label">Offer rate</div>
        </div>
      </div>

      <div className="panel">
        <h3>Applications per week</h3>
        <div className="bars" role="img" aria-label="Applications per week for the last 8 weeks">
          {data.weeks.map((w) => (
            <div key={w.start.getTime()} className="bar-col">
              <span className="bar-value">{w.count}</span>
              <div className="bar" style={{ height: `${Math.max(4, (w.count / data.maxWeek) * 100)}%` }} />
              <span className="bar-label">
                {w.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Where your applications stand</h3>
        <div className="stack" role="img" aria-label="Share of applications by status">
          {STATUSES.filter((s) => data.count[s] > 0).map((s) => (
            <div
              key={s}
              className={`stack-part col-${s.toLowerCase()}`}
              style={{ flex: data.count[s] }}
              title={`${s}: ${data.count[s]}`}
            />
          ))}
        </div>
        <ul className="legend">
          {STATUSES.map((s) => (
            <li key={s} className={`col-${s.toLowerCase()}`}>
              <span className="dot" /> {s} <b>{data.count[s]}</b>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Rates use each application's current status, and don't count Wishlist items.
        </p>
      </div>
    </div>
  );
}
