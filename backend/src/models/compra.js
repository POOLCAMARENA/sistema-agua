const pool = require('../config/database');
const Kardex = require('./kardex');

class Compra {
  static async crear(datos) {
    const { proveedor_id, tipo_pago, detalle, observaciones, usuario_id } = datos;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Calcular total
      let total = 0;
      for (const item of detalle) {
        total += item.cantidad * item.precio_unitario;
      }

      // Crear compra
      const compraResult = await client.query(
        'INSERT INTO compras (proveedor_id, total, tipo_pago, observaciones, usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [proveedor_id, total, tipo_pago, observaciones, usuario_id]
      );
      const compra = compraResult.rows[0];

      // Crear detalles de compra y actualizar kardex
      for (const item of detalle) {
        // Insertar detalle
        await client.query(
          'INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [compra.id, item.producto_id, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
        );

        // Registrar en kardex (entrada)
        await Kardex.registrarMovimiento({
          producto_id: item.producto_id,
          tipo_movimiento: 'entrada',
          cantidad: item.cantidad,
          referencia: `Compra #${compra.id}`,
          documento_id: compra.id,
          documento_tipo: 'compra',
          observaciones: `Compra a proveedor ${proveedor_id}`
        });
      }

      await client.query('COMMIT');
      return compra;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async listar({ proveedor_id, tipo_pago, fecha_inicio, fecha_fin, estado } = {}) {
    let query = `
      SELECT c.*, p.nombre as proveedor_nombre 
      FROM compras c 
      LEFT JOIN proveedores p ON c.proveedor_id = p.id 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (proveedor_id) {
      query += ` AND c.proveedor_id = $${paramIndex}`;
      params.push(proveedor_id);
      paramIndex++;
    }

    if (tipo_pago) {
      query += ` AND c.tipo_pago = $${paramIndex}`;
      params.push(tipo_pago);
      paramIndex++;
    }

    if (estado) {
      query += ` AND c.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    if (fecha_inicio) {
      query += ` AND c.fecha >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      query += ` AND c.fecha <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    query += ' ORDER BY c.fecha DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT c.*, p.nombre as proveedor_nombre FROM compras c LEFT JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async obtenerDetalles(compra_id) {
    const result = await pool.query(
      'SELECT dc.*, p.nombre as producto_nombre FROM detalle_compras dc JOIN productos p ON dc.producto_id = p.id WHERE dc.compra_id = $1',
      [compra_id]
    );
    return result.rows;
  }

  static async actualizarEstado(id, estado) {
    const result = await pool.query(
      'UPDATE compras SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0];
  }

  static async obtenerEstadisticas(fecha_inicio, fecha_fin) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_compras,
        SUM(total) as total_gastado,
        AVG(total) as compra_promedio
      FROM compras
      WHERE fecha BETWEEN $1 AND $2 AND estado = 'completada'
    `, [fecha_inicio, fecha_fin]);
    return result.rows[0];
  }
}

module.exports = Compra;
