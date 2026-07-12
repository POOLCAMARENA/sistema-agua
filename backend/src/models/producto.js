const pool = require('../config/database');

class Producto {
  static async crear(datos) {
    const { nombre, descripcion, unidad_medida, precio_venta, precio_compra, stock_actual, stock_minimo, categoria } = datos;
    const result = await pool.query(
      'INSERT INTO productos (nombre, descripcion, unidad_medida, precio_venta, precio_compra, stock_actual, stock_minimo, categoria) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [nombre, descripcion, unidad_medida, precio_venta, precio_compra, stock_actual, stock_minimo, categoria]
    );
    return result.rows[0];
  }

  static async listar({ categoria, estado, buscar } = {}) {
    let query = 'SELECT * FROM productos WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (categoria) {
      query += ` AND categoria = $${paramIndex}`;
      params.push(categoria);
      paramIndex++;
    }

    if (estado) {
      query += ` AND estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    if (buscar) {
      query += ` AND (nombre ILIKE $${paramIndex} OR descripcion ILIKE $${paramIndex})`;
      params.push(`%${buscar}%`);
      paramIndex++;
    }

    query += ' ORDER BY nombre';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT * FROM productos WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async actualizar(id, datos) {
    const { nombre, descripcion, unidad_medida, precio_venta, precio_compra, stock_actual, stock_minimo, categoria, estado } = datos;
    const result = await pool.query(
      'UPDATE productos SET nombre = $1, descripcion = $2, unidad_medida = $3, precio_venta = $4, precio_compra = $5, stock_actual = $6, stock_minimo = $7, categoria = $8, estado = $9 WHERE id = $10 RETURNING *',
      [nombre, descripcion, unidad_medida, precio_venta, precio_compra, stock_actual, stock_minimo, categoria, estado, id]
    );
    return result.rows[0];
  }

  static async actualizarStock(id, cantidad) {
    const result = await pool.query(
      'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2 RETURNING *',
      [cantidad, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    try {
      const result = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      if (error.code === '23503') {
        const result = await pool.query(
          'UPDATE productos SET estado = $1 WHERE id = $2',
          ['inactivo', id]
        );
        return result.rowCount > 0;
      }
      throw error;
    }
  }

  static async obtenerStockBajo() {
    const result = await pool.query(
      'SELECT * FROM productos WHERE stock_actual <= stock_minimo AND estado = $1 ORDER BY stock_actual',
      ['activo']
    );
    return result.rows;
  }

  static async obtenerEstadisticas() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'activo') as activos,
        SUM(stock_actual) as stock_total,
        COUNT(*) FILTER (WHERE stock_actual <= stock_minimo) as stock_bajo
      FROM productos
    `);
    return result.rows[0];
  }
}

module.exports = Producto;
