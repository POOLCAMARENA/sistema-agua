const pool = require('../config/database');

class Consumo {
  static async crear(cliente_id, capacidad_total) {
    const result = await pool.query(
      'INSERT INTO consumo_cliente (cliente_id, capacidad_total, consumo_actual, porcentaje_consumido) VALUES ($1, $2, 0, 0) RETURNING *',
      [cliente_id, capacidad_total]
    );
    return result.rows[0];
  }

  static async buscarPorCliente(cliente_id) {
    const result = await pool.query(
      'SELECT * FROM consumo_cliente WHERE cliente_id = $1',
      [cliente_id]
    );
    return result.rows[0];
  }

  static async actualizarConsumo(cliente_id, consumo_actual) {
    const consumoCliente = await pool.query(
      'SELECT * FROM consumo_cliente WHERE cliente_id = $1',
      [cliente_id]
    );

    if (!consumoCliente.rows[0]) {
      throw new Error('No hay registro de consumo para este cliente');
    }

    const capacidad_total = consumoCliente.rows[0].capacidad_total;
    const porcentaje = (consumo_actual / capacidad_total) * 100;
    
    let estado = 'normal';
    if (porcentaje >= 100) {
      estado = 'vacío';
    } else if (porcentaje >= 75) {
      estado = 'crítico';
    } else if (porcentaje >= 50) {
      estado = 'medio';
    }

    const alerta_enviada = porcentaje >= 100 ? false : consumoCliente.rows[0].alerta_enviada;

    const result = await pool.query(
      'UPDATE consumo_cliente SET consumo_actual = $1, porcentaje_consumido = $2, estado = $3, alerta_enviada = $4, fecha_ultima_lectura = CURRENT_TIMESTAMP WHERE cliente_id = $5 RETURNING *',
      [consumo_actual, porcentaje, estado, alerta_enviada, cliente_id]
    );
    return result.rows[0];
  }

  static async marcarAlertaEnviada(cliente_id) {
    const result = await pool.query(
      'UPDATE consumo_cliente SET alerta_enviada = true WHERE cliente_id = $1 RETURNING *',
      [cliente_id]
    );
    return result.rows[0];
  }

  static async listar({ estado, alerta_pendiente } = {}) {
    let query = `
      SELECT cc.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion 
      FROM consumo_cliente cc 
      JOIN clientes c ON cc.cliente_id = c.id 
      WHERE c.estado = 'activo'
    `;
    const params = [];
    let paramIndex = 1;

    if (estado) {
      query += ` AND cc.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    if (alerta_pendiente) {
      query += ` AND cc.alerta_enviada = false AND cc.porcentaje_consumido >= 75`;
    }

    query += ' ORDER BY cc.porcentaje_consumido DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async obtenerAlertasPendientes() {
    const result = await pool.query(`
      SELECT cc.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion 
      FROM consumo_cliente cc 
      JOIN clientes c ON cc.cliente_id = c.id 
      WHERE cc.alerta_enviada = false 
      AND cc.porcentaje_consumido >= 75
      AND c.estado = 'activo'
      ORDER BY cc.porcentaje_consumido DESC
    `);
    return result.rows;
  }

  static async obtenerClientesCriticos() {
    const result = await pool.query(`
      SELECT cc.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion 
      FROM consumo_cliente cc 
      JOIN clientes c ON cc.cliente_id = c.id 
      WHERE cc.estado IN ('crítico', 'vacío')
      AND c.estado = 'activo'
      ORDER BY cc.porcentaje_consumido DESC
    `);
    return result.rows;
  }

  static async actualizarCapacidad(cliente_id, capacidad_total) {
    const consumoCliente = await pool.query(
      'SELECT consumo_actual FROM consumo_cliente WHERE cliente_id = $1',
      [cliente_id]
    );

    if (!consumoCliente.rows[0]) {
      throw new Error('No hay registro de consumo para este cliente');
    }

    const consumo_actual = consumoCliente.rows[0].consumo_actual;
    const porcentaje = (consumo_actual / capacidad_total) * 100;
    
    let estado = 'normal';
    if (porcentaje >= 100) {
      estado = 'vacío';
    } else if (porcentaje >= 75) {
      estado = 'crítico';
    } else if (porcentaje >= 50) {
      estado = 'medio';
    }

    const result = await pool.query(
      'UPDATE consumo_cliente SET capacidad_total = $1, porcentaje_consumido = $2, estado = $3, alerta_enviada = false WHERE cliente_id = $4 RETURNING *',
      [capacidad_total, porcentaje, estado, cliente_id]
    );
    return result.rows[0];
  }

  static async obtenerEstadisticas() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_clientes,
        COUNT(*) FILTER (WHERE estado = 'normal') as normales,
        COUNT(*) FILTER (WHERE estado = 'medio') as medios,
        COUNT(*) FILTER (WHERE estado = 'crítico') as criticos,
        COUNT(*) FILTER (WHERE estado = 'vacío') as vacios,
        COUNT(*) FILTER (WHERE alerta_enviada = false AND porcentaje_consumido >= 75) as alertas_pendientes
      FROM consumo_cliente
    `);
    return result.rows[0];
  }
}

module.exports = Consumo;
