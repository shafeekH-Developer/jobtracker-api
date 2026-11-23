const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
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
    const { company, role, status, applied_date, job_link, notes } = req.body;
    if (!company || !company.trim() || !role || !role.trim()) {
      return res.status(400).json({ error: "company and role are required" });
    }
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    const result = await pool.query(
      `INSERT INTO applications (company, role, status, applied_date, job_link, notes, user_id)
       VALUES ($1, $2, COALESCE($3, 'Applied'), COALESCE($4::date, CURRENT_DATE), COALESCE($5, ''), COALESCE($6, ''), $7)
       RETURNING *`,
      [company.trim(), role.trim(), status || null, applied_date || null, job_link ?? null, notes ?? null, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "22007" || err.code === "22008") {
      return res.status(400).json({ error: "applied_date must be a valid date (YYYY-MM-DD)" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /applications/:id  (send only the fields you want to change)
router.put("/:id", async (req, res) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(404).json({ error: "Application not found" });
    const { company, role, status, applied_date, job_link, notes } = req.body;
    if (company !== undefined && !String(company).trim()) {
      return res.status(400).json({ error: "company cannot be empty" });
    }
    if (role !== undefined && !String(role).trim()) {
      return res.status(400).json({ error: "role cannot be empty" });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    const result = await pool.query(
      `UPDATE applications SET
         company = COALESCE($1, company),
         role = COALESCE($2, role),
         status = COALESCE($3, status),
         applied_date = COALESCE($4::date, applied_date),
         job_link = COALESCE($5, job_link),
         notes = COALESCE($6, notes)
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        company !== undefined ? String(company).trim() : null,
        role !== undefined ? String(role).trim() : null,
        status ?? null,
        applied_date ?? null,
        job_link ?? null,
        notes ?? null,
        id,
        req.userId,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "22007" || err.code === "22008") {
      return res.status(400).json({ error: "applied_date must be a valid date (YYYY-MM-DD)" });
    }
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