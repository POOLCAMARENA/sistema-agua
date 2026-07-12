const { Pool } = require('pg');
require('dotenv').config();

// Configurar pg para que devuelva números en vez de strings
const types = require('pg').types;
const NUMERIC_OID = 1700;
types.setTypeParser(NUMERIC_OID, (val) => parseFloat(val));

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sistema_agua',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
      }
);

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});

module.exports = pool;
