require("dotenv").config();

// Stop at once if the secret key is missing, so we never run unprotected
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

const express = require("express");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");

const app = express();
const PORT = 3000;

// Lets Express read JSON sent in a request body
app.use(express.json());

// GET /  -> health check
app.get("/", (req, res) => {
  res.json({ message: "Task API is running" });
});

// /auth/register and /auth/login
app.use("/auth", authRoutes);

// /tasks (login required)
app.use("/tasks", taskRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});