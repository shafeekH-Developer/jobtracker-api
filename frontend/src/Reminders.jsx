import { useMemo } from "react";
import Icon from "./Icons.jsx";
import { daysFromToday, relativeDay, formatShort } from "./utils.js";

// Interviews in the next 7 days, and follow-ups that are due soon or overdue.
export default function Reminders({ apps, onOpen }) {
  const items = useMemo(() => {
    const list = [];
    apps.forEach((a) => {
      const iv = daysFromToday(a.interview_date);
      if (iv !== null && iv >= 0 && iv <= 7 && a.status !== "Rejected") {
        list.push({ key: `i${a.id}`, app: a, kind: "interview", days: iv });
      }
      const fu = daysFromToday(a.follow_up_date);
      if (fu !== null && fu <= 7 && ["Wishlist", "Applied", "Interview"].includes(a.status)) {
        list.push({ key: `f${a.id}`, app: a, kind: "follow", days: fu });
      }
    });
    return list.sort((x, y) => x.days - y.days);
  }, [apps]);

  if (items.length === 0) return null;

  return (
    <section className="reminders">
      <h3>
        <Icon name="bell" size={16} /> Needs your attention
      </h3>
      <div className="reminder-list">
        {items.map(({ key, app, kind, days }) => {
          const date = kind === "interview" ? app.interview_date : app.follow_up_date;
          const tone = days < 0 ? "overdue" : days === 0 ? "today" : "soon";
          return (
            <button key={key} className={`reminder ${tone}`} onClick={() => onOpen(app)}>
              <span className="reminder-icon">
                <Icon name={kind === "interview" ? "calendar" : "mail"} size={16} />
              </span>
              <span className="reminder-text">
                <b>{kind === "interview" ? "Interview" : "Follow up"}</b> · {app.company}
                <small>
                  {app.role} · {formatShort(date)}
                </small>
              </span>
              <span className="reminder-when">{days < 0 ? `Overdue · ${relativeDay(days)}` : relativeDay(days)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
