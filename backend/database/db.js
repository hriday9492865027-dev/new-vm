const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'vm',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 20, // Max connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database: "vm"');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL error on idle client:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
