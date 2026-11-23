import { useState } from "react";

export const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ApplicationForm({ application, onSave, onClose }) {
  const editing = Boolean(application);
  const [company, setCompany] = useState(application?.company || "");
  const [role, setRole] = useState(application?.role || "");
  const [status, setStatus] = useState(application?.status || "Applied");
  const [appliedDate, setAppliedDate] = useState(
    application?.applied_date ? application.applied_date.slice(0, 10) : today()
  );
  const [jobLink, setJobLink] = useState(application?.job_link || "");
  const [notes, setNotes] = useState(application?.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        company: company.trim(),
        role: role.trim(),
        status,
        applied_date: appliedDate,
        job_link: jobLink.trim(),
        notes: notes.trim(),
      });
    } catch (err) {
      setError(err.message || "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{editing ? "Edit application" : "Add application"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <label>
              Company *
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Infosys" autoFocus />
            </label>
            <label>
              Role *
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Frontend Developer" />
            </label>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Applied on
              <input type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} />
            </label>
          </div>
          <label>
            Job link
            <input value={jobLink} onChange={(e) => setJobLink(e.target.value)} placeholder="https://..." />
          </label>
          <label>
            Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recruiter name, salary range, next steps..."
            />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
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
