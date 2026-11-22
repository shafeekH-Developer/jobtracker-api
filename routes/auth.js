const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  try {
    // Never store the real password, only a hash of it
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.trim().toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({ user, token: createToken(user.id) });
  } catch (error) {
    // 23505 = the email already exists (UNIQUE constraint)
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already registered" });
    }

    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.trim().toLowerCase(),
    ]);

    const user = result.rows[0];

    // Same message for "no such user" and "wrong password", so nobody
    // can find out which emails are registered
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      user: { id: user.id, email: user.email },
      token: createToken(user.id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;