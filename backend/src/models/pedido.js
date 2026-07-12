const pool = require('../config/database');

class Pedido {
  static async crear(datos) {
    const { cliente_id, detalle, observaciones, usuario_id } = datos;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let total = 0;
      for (const item of detalle) {
        total += item.cantidad * item.precio_unitario;
      }
      const pedidoResult = await client.query(
        'INSERT INTO pedidos (cliente_id, total, observaciones, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [cliente_id, total, observaciones, usuario_id]
      );
      const pedido = pedidoResult.rows[0];
      for (const item of detalle) {
        await client.query(
          'INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [pedido.id, item.producto_id, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
        );
      }
      await client.query('COMMIT');
      return pedido;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async listar({ estado, cliente_id, fecha_desde, fecha_hasta } = {}) {
    let query = `
      SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
        c.direccion as cliente_direccion, c.ubicacion as cliente_ubicacion,
        c.referencia as cliente_referencia
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (estado) {
      query += ` AND p.estado = $${idx}`;
      params.push(estado);
      idx++;
    }
    if (cliente_id) {
      query += ` AND p.cliente_id = $${idx}`;
      params.push(cliente_id);
      idx++;
    }
    if (fecha_desde) {
      query += ` AND p.fecha_creacion >= $${idx}`;
      params.push(fecha_desde);
      idx++;
    }
    if (fecha_hasta) {
      query += ` AND p.fecha_creacion <= $${idx}`;
      params.push(fecha_hasta);
      idx++;
    }
    query += ' ORDER BY p.fecha_creacion DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      `SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
        c.direccion as cliente_direccion, c.ubicacion as cliente_ubicacion,
        c.referencia as cliente_referencia
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async obtenerDetalles(pedido_id) {
    const result = await pool.query(
      'SELECT dp.*, pr.nombre as producto_nombre FROM detalle_pedidos dp JOIN productos pr ON dp.producto_id = pr.id WHERE dp.pedido_id = $1',
      [pedido_id]
    );
    return result.rows;
  }

  static async actualizarEstado(id, estado) {
    const fechaCol = estado === 'entregado' ? ', fecha_entrega = CURRENT_TIMESTAMP' : '';
    const result = await pool.query(
      `UPDATE pedidos SET estado = $1${fechaCol} WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    return result.rows[0];
  }

  static async obtenerEstadisticas() {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'entregado') as entregados,
        COUNT(*) as total,
        COALESCE(SUM(total) FILTER (WHERE estado = 'pendiente'), 0) as total_pendiente
      FROM pedidos
    `);
    return result.rows[0];
  }
}

module.exports = Pedido;
