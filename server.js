require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/applications");

const app = express();
const PORT = process.env.PORT || 3000;

// FRONTEND_URL can hold one or more comma-separated site addresses.
// When it is not set (local development), any origin is allowed.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Job Tracker API is running" });
});

app.use("/auth", authRoutes);
app.use("/applications", applicationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});