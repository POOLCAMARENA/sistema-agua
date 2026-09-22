const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const pool = require('./config/database');

// Migraciones automáticas al iniciar
async function runMigrations() {
  try {
    await pool.queryWithRetry(`
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
    await pool.queryWithRetry('CREATE INDEX IF NOT EXISTS idx_movimientos_bidones_cliente ON movimientos_bidones(cliente_id)');
    await pool.queryWithRetry('CREATE INDEX IF NOT EXISTS idx_movimientos_bidones_tipo ON movimientos_bidones(tipo)');

    // Tabla de programaciones de ventas
    await pool.queryWithRetry(`
      CREATE TABLE IF NOT EXISTS programaciones (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        ruta_id INTEGER REFERENCES rutas(id),
        fecha_programada DATE NOT NULL,
        hora_programada TIME NOT NULL,
        estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
        observaciones TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_completada TIMESTAMP
      )
    `);
    await pool.queryWithRetry(`
      CREATE TABLE IF NOT EXISTS detalle_programaciones (
        id SERIAL PRIMARY KEY,
        programacion_id INTEGER REFERENCES programaciones(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL
      )
    `);
    await pool.queryWithRetry('CREATE INDEX IF NOT EXISTS idx_programaciones_cliente ON programaciones(cliente_id)');
    await pool.queryWithRetry('CREATE INDEX IF NOT EXISTS idx_programaciones_fecha ON programaciones(fecha_programada)');
    await pool.queryWithRetry('CREATE INDEX IF NOT EXISTS idx_programaciones_estado ON programaciones(estado)');
    await pool.queryWithRetry('CREATE INDEX IF NOT EXISTS idx_programaciones_ruta ON programaciones(ruta_id)');

    // Corregir estados null en proveedores
    await pool.queryWithRetry("UPDATE proveedores SET estado = 'activo' WHERE estado IS NULL");
    await pool.queryWithRetry("UPDATE clientes SET estado = 'activo' WHERE estado IS NULL");
    await pool.queryWithRetry("UPDATE productos SET estado = 'activo' WHERE estado IS NULL");

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
app.use('/api/programaciones', require('./routes/programaciones'));

// Ruta de salud
app.get('/api/health', async (req, res) => {
  try {
    await pool.queryWithRetry('SELECT 1');
    res.json({ status: 'OK', message: 'Sistema de Agua API funcionando', db: 'conectada' });
  } catch (error) {
    res.status(503).json({ status: 'WARN', message: 'API funcionando pero base de datos no disponible', db: 'desconectada' });
  }
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

// ============================================
// Servir Frontend Estático
// ============================================
const frontendPublicPath = path.join(__dirname, '..', 'public');

// Servir archivos estáticos del frontend
if (fs.existsSync(frontendPublicPath)) {
  app.use(express.static(frontendPublicPath));
  console.log('[Frontend] Archivos estáticos del frontend configurados');
}

// Ruta catch-all para el frontend (después de todas las rutas API)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  
  const requestedPath = req.path === '/' ? '/index.html' : req.path;
  const htmlPath = path.join(frontendPublicPath, requestedPath);
  
  if (fs.existsSync(htmlPath) && htmlPath.endsWith('.html')) {
    return res.sendFile(htmlPath);
  }
  
  const indexPath = path.join(htmlPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  
  const mainIndex = path.join(frontendPublicPath, 'index.html');
  if (fs.existsSync(mainIndex)) {
    return res.sendFile(mainIndex);
  }
  
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Ruta no encontrada para API
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Keep-alive: evitar que Neon PostgreSQL se duerma
cron.schedule('*/4 * * * *', async () => {
  try {
    await pool.queryWithRetry('SELECT 1');
    console.log('[Keep-alive] Neon DB despierta');
  } catch (error) {
    console.error('[Keep-alive] Error manteniendo DB despierta:', error.message);
  }
});

const PORT = process.env.PORT || 3001;

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((err) => {
  console.error('Error en migraciones, intentando iniciar de todas formas:', err.message);
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT} (sin migraciones)`);
  });
});

module.exports = app;