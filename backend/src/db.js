const path = require('node:path');
const { readFile } = require('node:fs/promises');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '..', 'sql', 'init.sql');
  const schema = await readFile(schemaPath, 'utf8');
  await pool.query(schema);
}

module.exports = { pool, initializeDatabase };
