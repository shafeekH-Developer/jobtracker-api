const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Every route in this file needs a valid login token
router.use(requireAuth);

// Checks that the :id in the URL is a whole number
function parseId(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: "Invalid task id" });
    return null;
  }

  return id;
}

// GET /tasks  -> list my tasks (newest first)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /tasks/:id  -> get one of my tasks
router.get("/:id", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /tasks  -> create a task for me
router.post("/", async (req, res) => {
  const { title, description } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title.trim(), description || "", req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /tasks/:id  -> update one of my tasks
router.put("/:id", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { title, description, completed } = req.body;

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return res.status(400).json({ message: "Title cannot be empty" });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           completed = COALESCE($3, completed)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        title !== undefined ? title.trim() : null,
        description !== undefined ? description : null,
        completed !== undefined ? Boolean(completed) : null,
        id,
        req.userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /tasks/:id  -> delete one of my tasks
router.delete("/:id", async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;