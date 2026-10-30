const { Pool } = require('pg');
require('dotenv').config();

const types = require('pg').types;
const NUMERIC_OID = 1700;
types.setTypeParser(NUMERIC_OID, (val) => parseFloat(val));

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        allowExitOnIdle: true,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sistema_agua',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        allowExitOnIdle: true,
      }
);

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error en pool de PostgreSQL:', err.message);
});

async function queryWithRetry(text, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      const isConnectionError = !error.code || ['ECONNREFUSED', '57P01', '57P02', '57P03', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code) || error.message?.includes('Connection terminated') || error.message?.includes('timeout') || error.message?.includes('iring');
      if (isConnectionError && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`[DB] Intento ${i + 1} falló, reintentando en ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
}

pool.queryWithRetry = queryWithRetry;

module.exports = pool;
