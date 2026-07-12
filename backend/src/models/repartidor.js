const pool = require('../config/database');

class Repartidor {
  static async crear(datos) {
    const { nombre, telefono, dni, placa_vehiculo } = datos;
    const result = await pool.query(
      'INSERT INTO repartidores (nombre, telefono, dni, placa_vehiculo) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, telefono, dni, placa_vehiculo]
    );
    return result.rows[0];
  }

  static async listar({ estado } = {}) {
    let query = 'SELECT * FROM repartidores WHERE 1=1';
    const params = [];

    if (estado) {
      query += ' AND estado = $1';
      params.push(estado);
    }

    query += ' ORDER BY nombre';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT * FROM repartidores WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async actualizar(id, datos) {
    const { nombre, telefono, dni, placa_vehiculo, estado } = datos;
    const result = await pool.query(
      'UPDATE repartidores SET nombre = $1, telefono = $2, dni = $3, placa_vehiculo = $4, estado = $5 WHERE id = $6 RETURNING *',
      [nombre, telefono, dni, placa_vehiculo, estado, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query(
      'UPDATE repartidores SET estado = $1 WHERE id = $2',
      ['inactivo', id]
    );
    return result.rowCount > 0;
  }

  static async obtenerEstadisticasVentas(repartidor_id, fecha_inicio, fecha_fin) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_ventas,
        SUM(v.total) as total_ingresos,
        COUNT(DISTINCT v.cliente_id) as clientes_atendidos
      FROM ventas v
      WHERE v.repartidor_id = $1
      AND v.fecha BETWEEN $2 AND $3
      AND v.estado = 'completada'
    `, [repartidor_id, fecha_inicio, fecha_fin]);
    return result.rows[0];
  }
}

module.exports = Repartidor;
