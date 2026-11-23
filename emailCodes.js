const crypto = require("crypto");
const pool = require("./db");

const CODE_MINUTES = 10; // how long a code stays valid
const RESEND_SECONDS = 60; // minimum wait before a new code can be created
const MAX_ATTEMPTS = 5; // wrong guesses allowed per code

// The code is stored as an HMAC hash, so a database leak does not reveal live codes.
function hashCode(userId, purpose, code) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${purpose}:${code}`)
    .digest("hex");
}

function sameHash(a, b) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Creates a new 6-digit code. Returns the code, or null when one was created
// less than RESEND_SECONDS ago (the cooldown is enforced in a single SQL statement).
async function createCode(userId, purpose) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const result = await pool.query(
    `INSERT INTO email_codes (user_id, purpose, code_hash, attempts, expires_at, created_at)
     VALUES ($1, $2, $3, 0, NOW() + make_interval(mins => $4), NOW())
     ON CONFLICT (user_id, purpose) DO UPDATE
       SET code_hash = EXCLUDED.code_hash,
           attempts = 0,
           expires_at = EXCLUDED.expires_at,
           created_at = NOW()
       WHERE email_codes.created_at < NOW() - make_interval(secs => $5)
     RETURNING id`,
    [userId, purpose, hashCode(userId, purpose, code), CODE_MINUTES, RESEND_SECONDS]
  );
  return result.rows.length > 0 ? code : null;
}

// Removes a code, for example when the email could not be sent.
async function deleteCode(userId, purpose) {
  await pool.query("DELETE FROM email_codes WHERE user_id = $1 AND purpose = $2", [userId, purpose]);
}

// Checks a code the user typed. Every guess is counted before it is compared,
// so many guesses sent at the same moment cannot get past the attempt limit.
async function checkCode(userId, purpose, code) {
  const result = await pool.query(
    `UPDATE email_codes SET attempts = attempts + 1
     WHERE user_id = $1 AND purpose = $2 AND expires_at > NOW() AND attempts < $3
     RETURNING code_hash`,
    [userId, purpose, MAX_ATTEMPTS]
  );
  if (result.rows.length === 0) return false;

  if (!sameHash(result.rows[0].code_hash, hashCode(userId, purpose, code))) return false;

  await deleteCode(userId, purpose);
  return true;
}

module.exports = { createCode, deleteCode, checkCode, CODE_MINUTES, RESEND_SECONDS };
