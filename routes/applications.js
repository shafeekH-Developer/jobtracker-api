const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];
const JOB_TYPES = ["Remote", "Hybrid", "On-site"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Text fields and their maximum lengths (the same limits as the database columns).
const TEXT_LIMITS = {
  job_link: 2000,
  notes: 5000,
  salary: 80,
  location: 120,
  contact_name: 120,
  contact_email: 160,
};

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Checks the request body and returns { error } or { values }.
// For a partial update (PUT) only the fields that were sent are returned.
function readBody(body, { partial }) {
  const values = {};
  const has = (key) => body[key] !== undefined;

  // company and role (required)
  for (const key of ["company", "role"]) {
    if (has(key) || !partial) {
      const value = typeof body[key] === "string" ? body[key].trim() : "";
      if (!value) return { error: `${key} is required` };
      if (value.length > 150) return { error: `${key} must be 150 characters or fewer` };
      values[key] = value;
    }
  }

  // status
  if (has("status")) {
    if (!STATUSES.includes(body.status)) {
      return { error: `status must be one of: ${STATUSES.join(", ")}` };
    }
    values.status = body.status;
  }

  // job type
  if (has("job_type")) {
    if (!JOB_TYPES.includes(body.job_type)) {
      return { error: `job_type must be one of: ${JOB_TYPES.join(", ")}` };
    }
    values.job_type = body.job_type;
  }

  // applied_date (cannot be empty)
  if (has("applied_date")) {
    if (!DATE_RE.test(String(body.applied_date))) {
      return { error: "applied_date must be a valid date (YYYY-MM-DD)" };
    }
    values.applied_date = body.applied_date;
  }

  // optional dates (an empty value clears the date)
  for (const key of ["interview_date", "follow_up_date"]) {
    if (has(key)) {
      if (body[key] === null || body[key] === "") {
        values[key] = null;
      } else if (DATE_RE.test(String(body[key]))) {
        values[key] = body[key];
      } else {
        return { error: `${key} must be a valid date (YYYY-MM-DD)` };
      }
    }
  }

  // text fields
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (has(key)) {
      const value = body[key] === null ? "" : String(body[key]).trim();
      if (value.length > max) return { error: `${key} must be ${max} characters or fewer` };
      values[key] = value;
    }
  }

  return { values };
}

function isBadDate(err) {
  return err.code === "22007" || err.code === "22008";
}

// GET /applications  (optional ?status=Interview)
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    const result = status
      ? await pool.query(
          "SELECT * FROM applications WHERE user_id = $1 AND status = $2 ORDER BY applied_date DESC, id DESC",
          [req.userId, status]
        )
      : await pool.query(
          "SELECT * FROM applications WHERE user_id = $1 ORDER BY applied_date DESC, id DESC",
          [req.userId]
        );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /applications/stats  -> counts per status
router.get("/stats", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT status, COUNT(*)::int AS count FROM applications WHERE user_id = $1 GROUP BY status",
      [req.userId]
    );
    const stats = { Wishlist: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0, total: 0 };
    for (const row of result.rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /applications/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(404).json({ error: "Application not found" });
    const result = await pool.query(
      "SELECT * FROM applications WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /applications
router.post("/", async (req, res) => {
  try {
    const { error, values } = readBody(req.body || {}, { partial: false });
    if (error) return res.status(400).json({ error });

    // Only the fields that were sent are inserted; the database fills in the defaults.
    const columns = Object.keys(values);
    const params = Object.values(values);
    columns.push("user_id");
    params.push(req.userId);
    const placeholders = params.map((_, i) => `$${i + 1}`);

    const result = await pool.query(
      `INSERT INTO applications (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      params
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isBadDate(err)) return res.status(400).json({ error: "That date is not valid" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /applications/:id  (send only the fields you want to change)
router.put("/:id", async (req, res) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(404).json({ error: "Application not found" });

    const { error, values } = readBody(req.body || {}, { partial: true });
    if (error) return res.status(400).json({ error });

    const columns = Object.keys(values);
    if (columns.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    // Column names come from the fixed list above, never from the request itself.
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const params = [...Object.values(values), id, req.userId];

    const result = await pool.query(
      `UPDATE applications SET ${setClause} WHERE id = $${columns.length + 1} AND user_id = $${columns.length + 2} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (isBadDate(err)) return res.status(400).json({ error: "That date is not valid" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /applications/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(404).json({ error: "Application not found" });
    const result = await pool.query(
      "DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json({ message: "Application deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;