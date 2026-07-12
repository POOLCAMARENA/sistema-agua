const pool = require('../config/database');

class Kardex {
  static async registrarMovimiento(datos) {
    const { producto_id, tipo_movimiento, cantidad, referencia, documento_id, documento_tipo, observaciones } = datos;
    
    // Obtener stock actual
    const producto = await pool.query('SELECT stock_actual FROM productos WHERE id = $1', [producto_id]);
    if (!producto.rows[0]) {
      throw new Error('Producto no encontrado');
    }

    const stock_anterior = producto.rows[0].stock_actual;
    let stock_nuevo = stock_anterior;

    // Calcular nuevo stock según tipo de movimiento
    if (tipo_movimiento === 'entrada' || tipo_movimiento === 'ajuste') {
      stock_nuevo = stock_anterior + cantidad;
    } else if (tipo_movimiento === 'salida') {
      stock_nuevo = stock_anterior - cantidad;
      if (stock_nuevo < 0) {
        throw new Error('Stock insuficiente');
      }
    }

    // Registrar movimiento en kardex
    const result = await pool.query(
      'INSERT INTO kardex (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, referencia, documento_id, documento_tipo, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, referencia, documento_id, documento_tipo, observaciones]
    );

    // Actualizar stock del producto
    await pool.query(
      'UPDATE productos SET stock_actual = $1 WHERE id = $2',
      [stock_nuevo, producto_id]
    );

    return result.rows[0];
  }

  static async listar({ producto_id, tipo_movimiento, fecha_inicio, fecha_fin } = {}) {
    let query = 'SELECT k.*, p.nombre as producto_nombre FROM kardex k JOIN productos p ON k.producto_id = p.id WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (producto_id) {
      query += ` AND k.producto_id = $${paramIndex}`;
      params.push(producto_id);
      paramIndex++;
    }

    if (tipo_movimiento) {
      query += ` AND k.tipo_movimiento = $${paramIndex}`;
      params.push(tipo_movimiento);
      paramIndex++;
    }

    if (fecha_inicio) {
      query += ` AND k.fecha >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      query += ` AND k.fecha <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    query += ' ORDER BY k.fecha DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT k.*, p.nombre as producto_nombre FROM kardex k JOIN productos p ON k.producto_id = p.id WHERE k.id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async obtenerMovimientosPorProducto(producto_id, limite = 50) {
    const result = await pool.query(
      'SELECT * FROM kardex WHERE producto_id = $1 ORDER BY fecha DESC LIMIT $2',
      [producto_id, limite]
    );
    return result.rows;
  }

  static async obtenerReporte(fecha_inicio, fecha_fin) {
    const result = await pool.query(`
      SELECT 
        p.nombre as producto,
        p.categoria,
        SUM(CASE WHEN k.tipo_movimiento = 'entrada' THEN k.cantidad ELSE 0 END) as total_entradas,
        SUM(CASE WHEN k.tipo_movimiento = 'salida' THEN k.cantidad ELSE 0 END) as total_salidas,
        SUM(CASE WHEN k.tipo_movimiento = 'ajuste' THEN k.cantidad ELSE 0 END) as total_ajustes,
        MAX(k.stock_nuevo) as stock_final
      FROM kardex k
      JOIN productos p ON k.producto_id = p.id
      WHERE k.fecha BETWEEN $1 AND $2
      GROUP BY p.id, p.nombre, p.categoria
      ORDER BY p.nombre
    `, [fecha_inicio, fecha_fin]);
    return result.rows;
  }
}

module.exports = Kardex;
