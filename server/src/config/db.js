const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tinkerbellgarden',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
  timezone: '+07:00',
  namedPlaceholders: true,
});

async function assertDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log('Connected to MySQL database.');
  } finally {
    connection.release();
  }
}

module.exports = pool;
module.exports.assertDatabaseConnection = assertDatabaseConnection;
