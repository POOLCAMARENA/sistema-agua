const pool = require('../config/database');

class Cliente {
  static async crear(datos) {
    const { nombre, dni_ruc, telefono, direccion, referencia, ubicacion, foto, latitud, longitud, tipo_cliente } = datos;
    const dni = dni_ruc || null;
    const tipo = tipo_cliente || 'regular';
    const result = await pool.query(
      'INSERT INTO clientes (nombre, dni_ruc, telefono, direccion, referencia, ubicacion, foto, latitud, longitud, tipo_cliente) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [nombre, dni, telefono, direccion, referencia, ubicacion, foto, latitud, longitud, tipo]
    );
    return result.rows[0];
  }

  static async listar({ estado, tipo_cliente, buscar } = {}) {
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (estado !== undefined && estado !== null) {
      if (Array.isArray(estado)) {
        query += ` AND estado = ANY($${paramIndex}::varchar[])`;
        params.push(estado);
        paramIndex++;
      } else {
        query += ` AND estado = $${paramIndex}`;
        params.push(estado);
        paramIndex++;
      }
    } else {
      query += ` AND estado != 'inactivo'`;
    }

    if (tipo_cliente) {
      query += ` AND tipo_cliente = $${paramIndex}`;
      params.push(tipo_cliente);
      paramIndex++;
    }

    if (buscar) {
      query += ` AND (nombre ILIKE $${paramIndex} OR telefono ILIKE $${paramIndex} OR dni_ruc ILIKE $${paramIndex})`;
      params.push(`%${buscar}%`);
      paramIndex++;
    }

    query += ' ORDER BY nombre';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async buscarPorDniRuc(dni_ruc) {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE dni_ruc = $1',
      [dni_ruc]
    );
    return result.rows[0];
  }

  static async actualizar(id, datos) {
    const { nombre, dni_ruc, telefono, direccion, referencia, ubicacion, foto, latitud, longitud, tipo_cliente, estado } = datos;
    const dni = dni_ruc || null;
    const tipo = tipo_cliente || 'regular';
    const est = estado || 'activo';
    const result = await pool.query(
      'UPDATE clientes SET nombre = $1, dni_ruc = $2, telefono = $3, direccion = $4, referencia = $5, ubicacion = $6, foto = $7, latitud = $8, longitud = $9, tipo_cliente = $10, estado = $11, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $12 RETURNING *',
      [nombre, dni, telefono, direccion, referencia, ubicacion, foto, latitud, longitud, tipo, est, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    try {
      const result = await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (err) {
      if (err.code === '23503') {
        await pool.query('UPDATE clientes SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2', ['inactivo', id]);
        return true;
      }
      throw err;
    }
  }

  static async obtenerEstadisticas() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'activo') as activos,
        COUNT(*) FILTER (WHERE tipo_cliente = 'vip') as vip,
        COUNT(*) FILTER (WHERE tipo_cliente = 'empresarial') as empresarial
      FROM clientes
    `);
    return result.rows[0];
  }
}

module.exports = Cliente;
