const pool = require('../config/database');
const Kardex = require('./kardex');

class Venta {
  static async crear(datos) {
    const { cliente_id, repartidor_id, tipo_venta, tipo_pago, detalle, observaciones, usuario_id, dias_plazo } = datos;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Calcular total
      let total = 0;
      for (const item of detalle) {
        total += item.cantidad * item.precio_unitario;
      }

      const plazo = dias_plazo || 30;

      // Crear venta
      const ventaResult = await client.query(
        'INSERT INTO ventas (cliente_id, repartidor_id, tipo_venta, tipo_pago, total, dias_plazo, observaciones, usuario_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [cliente_id, repartidor_id, tipo_venta, tipo_pago, total, plazo, observaciones, usuario_id]
      );
      const venta = ventaResult.rows[0];

      // Crear detalles de venta y actualizar kardex
      for (const item of detalle) {
        // Insertar detalle
        await client.query(
          'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [venta.id, item.producto_id, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
        );

        // Registrar en kardex (salida)
        await Kardex.registrarMovimiento({
          producto_id: item.producto_id,
          tipo_movimiento: 'salida',
          cantidad: item.cantidad,
          referencia: `Venta #${venta.id}`,
          documento_id: venta.id,
          documento_tipo: 'venta',
          observaciones: `Venta a cliente ${cliente_id}`
        });
      }

      // Si es crédito, crear registro de crédito
      if (tipo_venta === 'credito') {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + plazo);
        await client.query(
          'INSERT INTO creditos (cliente_id, venta_id, monto_total, monto_pendiente, fecha_limite) VALUES ($1, $2, $3, $4, $5)',
          [cliente_id, venta.id, total, total, fechaLimite]
        );
      }

      await client.query('COMMIT');
      return venta;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async listar({ cliente_id, repartidor_id, tipo_venta, fecha_inicio, fecha_fin, estado } = {}) {
    let query = `
      SELECT v.*, c.nombre as cliente_nombre, r.nombre as repartidor_nombre 
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      LEFT JOIN repartidores r ON v.repartidor_id = r.id 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (cliente_id) {
      query += ` AND v.cliente_id = $${paramIndex}`;
      params.push(cliente_id);
      paramIndex++;
    }

    if (repartidor_id) {
      query += ` AND v.repartidor_id = $${paramIndex}`;
      params.push(repartidor_id);
      paramIndex++;
    }

    if (tipo_venta) {
      query += ` AND v.tipo_venta = $${paramIndex}`;
      params.push(tipo_venta);
      paramIndex++;
    }

    if (estado) {
      query += ` AND v.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    if (fecha_inicio) {
      query += ` AND v.fecha >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      query += ` AND v.fecha <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    query += ' ORDER BY v.fecha DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT v.*, c.nombre as cliente_nombre, r.nombre as repartidor_nombre FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id LEFT JOIN repartidores r ON v.repartidor_id = r.id WHERE v.id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async obtenerDetalles(venta_id) {
    const result = await pool.query(
      'SELECT dv.*, p.nombre as producto_nombre FROM detalle_ventas dv JOIN productos p ON dv.producto_id = p.id WHERE dv.venta_id = $1',
      [venta_id]
    );
    return result.rows;
  }

  static async actualizarEstado(id, estado) {
    const result = await pool.query(
      'UPDATE ventas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0];
  }

  static async obtenerEstadisticas(fecha_inicio, fecha_fin) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_ventas,
        COUNT(*) FILTER (WHERE tipo_venta = 'contado') as ventas_contado,
        COUNT(*) FILTER (WHERE tipo_venta = 'credito') as ventas_credito,
        SUM(total) as total_ingresos,
        AVG(total) as ticket_promedio
      FROM ventas
      WHERE fecha BETWEEN $1 AND $2 AND estado = 'completada'
    `, [fecha_inicio, fecha_fin]);
    return result.rows[0];
  }
}

module.exports = Venta;
