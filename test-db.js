const pool = require("./db");

(async () => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    console.log("Connected:", result.rows[0].now);
  } catch (error) {
    console.error("Connection failed:", error.message);
  } finally {
    await pool.end();
  }
})();