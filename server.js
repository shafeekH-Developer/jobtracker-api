require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

const express = require("express");
const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/applications");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Job Tracker API is running" });
});

app.use("/auth", authRoutes);
app.use("/applications", applicationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});