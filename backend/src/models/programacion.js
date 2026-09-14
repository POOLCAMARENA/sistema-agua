const pool = require('../config/database');

class Programacion {
  static async crear(datos) {
    const { cliente_id, ruta_id, fecha_programada, hora_programada, observaciones, usuario_id, detalle } = datos;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let total = 0;
      if (detalle && detalle.length > 0) {
        for (const item of detalle) {
          total += item.cantidad * item.precio_unitario;
        }
      }
      const result = await client.query(
        `INSERT INTO programaciones (cliente_id, ruta_id, fecha_programada, hora_programada, observaciones, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [cliente_id, ruta_id, fecha_programada, hora_programada, observaciones, usuario_id]
      );
      const programacion = result.rows[0];
      if (detalle && detalle.length > 0) {
        for (const item of detalle) {
          await client.query(
            `INSERT INTO detalle_programaciones (programacion_id, producto_id, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [programacion.id, item.producto_id, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
          );
        }
      }
      programacion.total = total;
      await client.query('COMMIT');
      return programacion;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async listar({ estado, cliente_id, ruta_id, fecha_desde, fecha_hasta } = {}) {
    let query = `
      SELECT p.*,
        c.nombre as cliente_nombre, c.telefono as cliente_telefono,
        c.direccion as cliente_direccion, c.ubicacion as cliente_ubicacion,
        c.referencia as cliente_referencia,
        r.nombre as ruta_nombre,
        COALESCE(SUM(dp.subtotal), 0) as total
      FROM programaciones p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN rutas r ON p.ruta_id = r.id
      LEFT JOIN detalle_programaciones dp ON p.id = dp.programacion_id
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
    if (ruta_id) {
      query += ` AND p.ruta_id = $${idx}`;
      params.push(ruta_id);
      idx++;
    }
    if (fecha_desde) {
      query += ` AND p.fecha_programada >= $${idx}`;
      params.push(fecha_desde);
      idx++;
    }
    if (fecha_hasta) {
      query += ` AND p.fecha_programada <= $${idx}`;
      params.push(fecha_hasta);
      idx++;
    }
    query += ' GROUP BY p.id, c.nombre, c.telefono, c.direccion, c.ubicacion, c.referencia, r.nombre ORDER BY p.fecha_programada DESC, p.hora_programada DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      `SELECT p.*,
        c.nombre as cliente_nombre, c.telefono as cliente_telefono,
        c.direccion as cliente_direccion, c.ubicacion as cliente_ubicacion,
        c.referencia as cliente_referencia,
        r.nombre as ruta_nombre
       FROM programaciones p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN rutas r ON p.ruta_id = r.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async obtenerDetalles(programacion_id) {
    const result = await pool.query(
      'SELECT dp.*, pr.nombre as producto_nombre FROM detalle_programaciones dp JOIN productos pr ON dp.producto_id = pr.id WHERE dp.programacion_id = $1',
      [programacion_id]
    );
    return result.rows;
  }

  static async actualizarEstado(id, estado) {
    const fechaCol = estado === 'completada' ? ', fecha_completada = CURRENT_TIMESTAMP' : '';
    const result = await pool.query(
      `UPDATE programaciones SET estado = $1${fechaCol} WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM detalle_programaciones WHERE programacion_id = $1', [id]);
      const result = await client.query('DELETE FROM programaciones WHERE id = $1 RETURNING *', [id]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerEstadisticas() {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'completada') as completadas,
        COUNT(*) FILTER (WHERE estado = 'cancelada') as canceladas,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE fecha_programada = CURRENT_DATE AND estado = 'pendiente') as hoy_pendientes
      FROM programaciones
    `);
    return result.rows[0];
  }
}

module.exports = Programacion;
