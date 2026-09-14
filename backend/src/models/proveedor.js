const pool = require('../config/database');

class Proveedor {
  static async crear(datos) {
    const { nombre, telefono, direccion, ruc, contacto } = datos;
    const result = await pool.queryWithRetry(
      'INSERT INTO proveedores (nombre, telefono, direccion, ruc, contacto, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, telefono || null, direccion || null, ruc || null, contacto || null, 'activo']
    );
    return result.rows[0];
  }

  static async listar({ estado } = {}) {
    let query = 'SELECT * FROM proveedores WHERE 1=1';
    const params = [];

    if (estado) {
      query += ' AND estado = $1';
      params.push(estado);
    }

    query += ' ORDER BY nombre';

    const result = await pool.queryWithRetry(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.queryWithRetry(
      'SELECT * FROM proveedores WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async actualizar(id, datos) {
    const { nombre, telefono, direccion, ruc, contacto, estado } = datos;
    const result = await pool.queryWithRetry(
      'UPDATE proveedores SET nombre = $1, telefono = $2, direccion = $3, ruc = $4, contacto = $5, estado = $6 WHERE id = $7 RETURNING *',
      [nombre, telefono || null, direccion || null, ruc || null, contacto || null, estado || 'activo', id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.queryWithRetry(
      'UPDATE proveedores SET estado = $1 WHERE id = $2',
      ['inactivo', id]
    );
    return result.rowCount > 0;
  }

  static async corregirEstados() {
    await pool.queryWithRetry("UPDATE proveedores SET estado = 'activo' WHERE estado IS NULL");
  }
}

module.exports = Proveedor;
