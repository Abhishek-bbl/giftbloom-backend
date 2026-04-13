const pool = require('./db');
require('dotenv').config();

async function test() {
  try {
    console.log('Testing connection...');
    console.log('Host:', process.env.DB_HOST);
    console.log('Port:', process.env.DB_PORT);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);
    const conn = await pool.getConnection();
    console.log('✅ Connected to Railway MySQL successfully!');
    const [rows] = await conn.execute('SELECT 1 as test');
    console.log('✅ Query works:', rows);
    conn.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error.code);
    process.exit(1);
  }
}

test();