const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class Usuario {
  static async crear({ nombre, email, password, rol, telefono }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, email, hashedPassword, rol, telefono]
    );
    return result.rows[0];
  }

  static async buscarPorEmail(email) {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, telefono, activo, fecha_creacion FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async listar() {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, telefono, activo, fecha_creacion FROM usuarios ORDER BY nombre'
    );
    return result.rows;
  }

  static async actualizar(id, datos) {
    const { nombre, email, rol, telefono, activo } = datos;
    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, email = $2, rol = $3, telefono = $4, activo = $5 WHERE id = $6 RETURNING id, nombre, email, rol, telefono, activo',
      [nombre, email, rol, telefono, activo, id]
    );
    return result.rows[0];
  }

  static async actualizarPassword(id, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2',
      [hashedPassword, id]
    );
    return result.rowCount > 0;
  }

  static async eliminar(id) {
    const result = await pool.query(
      'UPDATE usuarios SET activo = false WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  static async verificarPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
}

module.exports = Usuario;
