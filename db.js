require("dotenv").config();
const { Pool, types } = require("pg");

// Return DATE columns (like applied_date) as plain "YYYY-MM-DD" text,
// so the date never shifts because of time zones.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
