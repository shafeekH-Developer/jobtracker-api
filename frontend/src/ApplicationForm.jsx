import { useState } from "react";
import { STATUSES, JOB_TYPES, todayStr } from "./utils.js";
import Icon from "./Icons.jsx";

const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");

export default function ApplicationForm({ application, isNew, onSave, onDelete, onClose }) {
  const editing = Boolean(application) && !isNew;
  const [form, setForm] = useState({
    company: application?.company || "",
    role: application?.role || "",
    status: application?.status || "Applied",
    applied_date: dateOnly(application?.applied_date) || todayStr(),
    interview_date: dateOnly(application?.interview_date),
    follow_up_date: dateOnly(application?.follow_up_date),
    location: application?.location || "",
    job_type: application?.job_type || "On-site",
    salary: application?.salary || "",
    contact_name: application?.contact_name || "",
    contact_email: application?.contact_email || "",
    job_link: application?.job_link || "",
    notes: application?.notes || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.company.trim() || !form.role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        ...form,
        company: form.company.trim(),
        role: form.role.trim(),
        interview_date: form.interview_date || null,
        follow_up_date: form.follow_up_date || null,
      });
    } catch (err) {
      setError(err.message || "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{editing ? "Edit application" : "Add application"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">The job</div>
          <div className="grid-2">
            <label>
              Company *
              <input value={form.company} onChange={set("company")} placeholder="Infosys" autoFocus />
            </label>
            <label>
              Role *
              <input value={form.role} onChange={set("role")} placeholder="Frontend Developer" />
            </label>
            <label>
              Status
              <select value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Job type
              <select value={form.job_type} onChange={set("job_type")}>
                {JOB_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input value={form.location} onChange={set("location")} placeholder="Bengaluru" />
            </label>
            <label>
              Salary
              <input value={form.salary} onChange={set("salary")} placeholder="₹4–6 LPA" />
            </label>
          </div>

          <div className="form-section">Dates</div>
          <div className="grid-3">
            <label>
              Applied on
              <input type="date" value={form.applied_date} onChange={set("applied_date")} />
            </label>
            <label>
              Interview date
              <input type="date" value={form.interview_date} onChange={set("interview_date")} />
            </label>
            <label>
              Follow up on
              <input type="date" value={form.follow_up_date} onChange={set("follow_up_date")} />
            </label>
          </div>

          <div className="form-section">Contact and links</div>
          <div className="grid-2">
            <label>
              Recruiter name
              <input value={form.contact_name} onChange={set("contact_name")} placeholder="Priya Sharma" />
            </label>
            <label>
              Recruiter email
              <input type="email" value={form.contact_email} onChange={set("contact_email")} placeholder="priya@company.com" />
            </label>
          </div>
          <label>
            Job link
            <input value={form.job_link} onChange={set("job_link")} placeholder="https://..." />
          </label>
          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={set("notes")}
              placeholder="Interview rounds, topics to revise, next steps..."
            />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            {editing && (
              <button type="button" className="btn btn-danger push-left" onClick={onDelete}>
                <Icon name="trash" size={16} /> Delete
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Saving..." : editing ? "Save changes" : "Add application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
