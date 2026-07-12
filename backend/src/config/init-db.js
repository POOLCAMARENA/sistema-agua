const fs = require('fs');
const path = require('path');
const pool = require('./database');

async function initDatabase() {
  try {
    const sqlPath = path.join(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Inicializando base de datos...');
    await pool.query(sql);

    // Migraciones seguras (no destruyen datos existentes)
    await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ubicacion TEXT');
    await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS foto TEXT');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_entrega TIMESTAMP,
        total DECIMAL(10, 2) NOT NULL DEFAULT 0,
        observaciones TEXT,
        estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'entregado', 'cancelado')),
        usuario_id INTEGER REFERENCES usuarios(id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detalle_pedidos (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER REFERENCES pedidos(id),
        producto_id INTEGER REFERENCES productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL
      )
    `);

    // Migraciones para tipo_pago con 'plin'
    await pool.query(`ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_tipo_pago_check`);
    await pool.query(`ALTER TABLE ventas ADD CONSTRAINT ventas_tipo_pago_check CHECK (tipo_pago IN ('efectivo', 'yape', 'transferencia', 'plin'))`);
    await pool.query(`ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_tipo_pago_check`);
    await pool.query(`ALTER TABLE pagos ADD CONSTRAINT pagos_tipo_pago_check CHECK (tipo_pago IN ('efectivo', 'yape', 'transferencia', 'plin'))`);
    await pool.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS dias_plazo INTEGER DEFAULT 30`);

    // Crear/actualizar usuarios con contraseña hasheada
    const bcrypt = require('bcryptjs');

    const usuarios = [
      { nombre: 'Administrador', email: 'admin@sistemaagua.com', password: 'admin123', rol: 'admin', telefono: '999999999' },
      { nombre: 'Cajero Prueba', email: 'cajero@sistemaagua.com', password: 'cajero123', rol: 'cajero', telefono: '888888888' },
      { nombre: 'Repartidor Prueba', email: 'repartidor@sistemaagua.com', password: 'repartidor123', rol: 'repartidor', telefono: '777777777' },
    ];

    for (const u of usuarios) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET nombre = $1, password = $3, rol = $4, telefono = $5',
        [u.nombre, u.email, hash, u.rol, u.telefono]
      );
    }

    console.log('Usuarios actualizados correctamente.');

    console.log('Base de datos inicializada correctamente.');
    console.log('Usuario admin: admin@sistemaagua.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

initDatabase();
