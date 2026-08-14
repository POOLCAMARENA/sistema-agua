const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');

// Migraciones automáticas al iniciar
async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movimientos_bidones (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrega', 'retorno', 'perdida')),
        cantidad INTEGER NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT,
        usuario_id INTEGER REFERENCES usuarios(id)
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_movimientos_bidones_cliente ON movimientos_bidones(cliente_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_movimientos_bidones_tipo ON movimientos_bidones(tipo)');
    console.log('Migraciones ejecutadas correctamente');
  } catch (error) {
    console.error('Error ejecutando migraciones:', error);
  }
}

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  credentials: process.env.CORS_ORIGIN !== '*'
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/compras', require('./routes/compras'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/upload', require('./routes/upload'));
app.use('/uploads', express.static('uploads'));
app.use('/api/kardex', require('./routes/kardex'));
app.use('/api/creditos', require('./routes/creditos'));
app.use('/api/repartidores', require('./routes/repartidores'));
app.use('/api/rutas', require('./routes/rutas'));
app.use('/api/bidones', require('./routes/bidones'));
app.use('/api/consumo', require('./routes/consumo'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/backup', require('./routes/backup'));

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Agua API funcionando' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Error interno del servidor',
      status: err.status || 500
    }
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3001;

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
});

module.exports = app;
