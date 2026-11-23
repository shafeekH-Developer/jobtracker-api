export const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];
export const JOB_TYPES = ["Remote", "Hybrid", "On-site"];

export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDate(value) {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShort(value) {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// How many days from today a date is (0 = today, 1 = tomorrow, -1 = yesterday).
export function daysFromToday(value) {
  const d = parseDate(value);
  if (!d) return null;
  return Math.round((d - parseDate(todayStr())) / 86400000);
}

export function relativeDay(n) {
  if (n === null) return "";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function safeLink(url) {
  return /^https?:\/\//i.test(url || "") ? url : null;
}

const CSV_COLUMNS = [
  ["Company", "company"],
  ["Role", "role"],
  ["Status", "status"],
  ["Applied on", "applied_date"],
  ["Interview date", "interview_date"],
  ["Follow-up date", "follow_up_date"],
  ["Location", "location"],
  ["Job type", "job_type"],
  ["Salary", "salary"],
  ["Contact name", "contact_name"],
  ["Contact email", "contact_email"],
  ["Job link", "job_link"],
  ["Notes", "notes"],
];

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  // A leading = + - @ can run as a formula when the file is opened in Excel, so neutralise it.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function applicationsToCsv(apps) {
  const header = CSV_COLUMNS.map(([label]) => csvCell(label)).join(",");
  const rows = apps.map((a) =>
    CSV_COLUMNS.map(([, key]) => csvCell(String(a[key] ?? "").slice(0, key.includes("date") ? 10 : undefined))).join(",")
  );
  return "﻿" + [header, ...rows].join("\r\n");
}

export function downloadFile(filename, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
