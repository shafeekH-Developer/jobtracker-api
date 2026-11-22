require("dotenv").config();
const { Pool } = require("pg");

// One shared pool of database connections for the whole app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;