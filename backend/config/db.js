const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dawri_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Please check:');
    console.error('1. XAMPP MySQL is running');
    console.error('2. Database "dawri_db" exists');
    console.error('3. Username is "root" and password is empty');
    return;
  }
  console.log('✅ Connected to MySQL pool');
  connection.release();
});

module.exports = pool;