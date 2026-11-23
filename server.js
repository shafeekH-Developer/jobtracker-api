require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/applications");

const app = express();
const PORT = process.env.PORT || 3000;

// Render puts one proxy in front of the app; this makes the rate limiter see each visitor's real IP.
app.set("trust proxy", 1);

// FRONTEND_URL can hold one or more comma-separated site addresses.
// When it is not set (local development), any origin is allowed.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "20kb" }));

// Limits repeated requests to the login, signup and email-code routes (protects against guessing and email spam).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});

app.get("/", (req, res) => {
  res.json({ message: "Job Tracker API is running" });
});

app.use("/auth", authLimiter, authRoutes);
app.use("/applications", applicationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
