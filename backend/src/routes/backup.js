const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { adminAuth } = require('../middleware/auth');

const TABLAS = [
  'usuarios',
  'clientes',
  'proveedores',
  'productos',
  'pedidos',
  'detalle_pedidos',
  'repartidores',
  'rutas',
  'clientes_ruta',
  'compras',
  'detalle_compras',
  'ventas',
  'detalle_ventas',
  'kardex',
  'creditos',
  'pagos',
  'bidones_cliente',
  'consumo_cliente',
];

router.get('/download', adminAuth, async (req, res) => {
  try {
    let sql = '-- Backup del Sistema de Agua\n';
    sql += `-- Fecha: ${new Date().toISOString()}\n\n`;

    for (const tabla of TABLAS) {
      const result = await pool.query(`SELECT * FROM ${tabla}`);
      if (result.rows.length === 0) continue;

      const cols = result.rows.map((_, i) => (i === 0 ? `(${result.fields.map(f => `"${f.name}"`).join(', ')})` : '')).filter(Boolean);

      sql += `-- ${tabla}\n`;

      const columns = result.fields.map(f => `"${f.name}"`).join(', ');

      for (const row of result.rows) {
        const values = result.fields.map(f => {
          const val = row[f.name];
          if (val === null) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return val;
          const escaped = String(val).replace(/'/g, "''");
          return `'${escaped}'`;
        });

        sql += `INSERT INTO ${tabla} (${columns}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }
      sql += '\n';
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const nombre = `backup_sistema_agua_${fecha}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(sql);
  } catch (error) {
    console.error('Error al generar backup:', error);
    res.status(500).json({ error: 'Error al generar el backup' });
  }
});

router.post('/restore', adminAuth, async (req, res) => {
  try {
    const { sql } = req.body;

    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'No se proporcionó contenido SQL válido' });
    }

    await pool.query('BEGIN');

    for (const tabla of [...TABLAS].reverse()) {
      await pool.query(`DELETE FROM ${tabla}`);
    }

    const lineas = sql.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'));

    for (const linea of lineas) {
      const trimmed = linea.trim();
      if (trimmed) {
        await pool.query(trimmed);
      }
    }

    await pool.query('COMMIT');

    res.json({ message: 'Base de datos restaurada correctamente' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al restaurar backup:', error);
    res.status(500).json({ error: 'Error al restaurar el backup: ' + error.message });
  }
});

module.exports = router;
