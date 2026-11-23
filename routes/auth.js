const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { createCode, deleteCode, checkCode } = require("../emailCodes");
const { sendCodeEmail } = require("../mailer");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;
// Used when the email is unknown, so a wrong email and a wrong password take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function passwordError(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (Buffer.byteLength(password) > 72) {
    return "Password is too long (72 characters at most)";
  }
  return null;
}

function createToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

function publicUser(user) {
  return { id: user.id, email: user.email };
}

async function findUser(email) {
  const result = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1", [email]);
  return result.rows[0];
}

// Creates a code and emails it. Returns "sent", or "wait" when a code was sent less than a minute ago.
// If the email cannot be sent, the code is removed again and the error is thrown.
async function sendCode(user, purpose) {
  const code = await createCode(user.id, purpose);
  if (!code) return "wait";
  try {
    await sendCodeEmail(user.email, code, purpose);
  } catch (err) {
    await deleteCode(user.id, purpose);
    throw err;
  }
  return "sent";
}

function serverError(res, err) {
  console.error(err);
  return res.status(500).json({ error: "Server error" });
}

function emailSendError(res, err) {
  console.error("Email sending failed:", err.message);
  return res.status(502).json({ error: "We could not send the email. Please try again in a moment." });
}

// POST /auth/register  -> creates the account and emails a 6-digit code (no token yet)
router.post("/register", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const password = req.body?.password;

    if (!EMAIL_RE.test(email) || email.length > 255) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    const pwError = passwordError(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const hash = await bcrypt.hash(password, 10);
    let user = await findUser(email);

    if (user && user.email_verified) {
      return res.status(409).json({ error: "This email is already registered. Please log in." });
    }

    if (user) {
      // The email was never verified, so the newest signup takes over the account.
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, user.id]);
    } else {
      const result = await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *",
        [email, hash]
      );
      user = result.rows[0];
    }

    try {
      await sendCode(user, "verify");
    } catch (err) {
      return emailSendError(res, err);
    }

    res.status(201).json({
      message: `We sent a 6-digit code to ${email}.`,
      email,
      needs_verification: true,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "This email is already registered. Please log in." });
    }
    serverError(res, err);
  }
});

// POST /auth/verify-email  -> checks the code, marks the email as verified and logs the user in
router.post("/verify-email", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const code = String(req.body?.code ?? "").trim();

    if (!EMAIL_RE.test(email) || !CODE_RE.test(code)) {
      return res.status(400).json({ error: "Enter the 6-digit code from your email" });
    }

    const user = await findUser(email);
    if (user && user.email_verified) {
      return res.status(400).json({ error: "This email is already verified. Please log in." });
    }
    if (!user || !(await checkCode(user.id, "verify", code))) {
      return res.status(400).json({ error: "That code is wrong or has expired" });
    }

    await pool.query("UPDATE users SET email_verified = TRUE WHERE id = $1", [user.id]);
    res.json({ user: publicUser(user), token: createToken(user) });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /auth/resend-code  { email, purpose: "verify" | "reset" }
router.post("/resend-code", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const purpose = req.body?.purpose;

    if (!EMAIL_RE.test(email) || !["verify", "reset"].includes(purpose)) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const user = await findUser(email);
    const allowed = user && (purpose === "reset" || !user.email_verified);
    if (allowed) {
      try {
        await sendCode(user, purpose);
      } catch (err) {
        return emailSendError(res, err);
      }
    }

    // The same answer is given whether or not the account exists.
    res.json({ message: "If that account exists, a new code is on its way." });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /auth/forgot-password  { email }
router.post("/forgot-password", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    const user = await findUser(email);
    if (user) {
      try {
        await sendCode(user, "reset");
      } catch (err) {
        return emailSendError(res, err);
      }
    }

    res.json({ message: "If an account exists for that email, we sent a reset code." });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /auth/reset-password  { email, code, new_password }
router.post("/reset-password", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const code = String(req.body?.code ?? "").trim();
    const newPassword = req.body?.new_password;

    if (!EMAIL_RE.test(email) || !CODE_RE.test(code)) {
      return res.status(400).json({ error: "Enter the 6-digit code from your email" });
    }
    const pwError = passwordError(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });

    const user = await findUser(email);
    if (!user || !(await checkCode(user.id, "reset", code))) {
      return res.status(400).json({ error: "That code is wrong or has expired" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    // Entering the emailed code also proves the person owns the email address.
    await pool.query("UPDATE users SET password_hash = $1, email_verified = TRUE WHERE id = $2", [hash, user.id]);
    await deleteCode(user.id, "verify");

    res.json({ message: "Your password was updated. You can log in now." });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUser(email);
    const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !passwordOk) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.email_verified) {
      // The password is right but the email was never verified: send a fresh code.
      try {
        await sendCode(user, "verify");
      } catch (err) {
        console.error("Email sending failed:", err.message);
      }
      return res.status(403).json({
        error: "Please verify your email first. We sent you a new code.",
        needs_verification: true,
        email: user.email,
      });
    }

    res.json({ user: publicUser(user), token: createToken(user) });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
