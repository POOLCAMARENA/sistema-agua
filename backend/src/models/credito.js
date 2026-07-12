const pool = require('../config/database');

class Credito {
  static async listar({ cliente_id, estado, fecha_inicio, fecha_fin } = {}) {
    let query = `
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono 
      FROM creditos c 
      JOIN clientes cl ON c.cliente_id = cl.id 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (cliente_id) {
      query += ` AND c.cliente_id = $${paramIndex}`;
      params.push(cliente_id);
      paramIndex++;
    }

    if (estado) {
      query += ` AND c.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    if (fecha_inicio) {
      query += ` AND c.fecha_credito >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      query += ` AND c.fecha_credito <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    query += ' ORDER BY c.fecha_credito DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async buscarPorId(id) {
    const result = await pool.query(
      'SELECT c.*, cl.nombre as cliente_nombre FROM creditos c JOIN clientes cl ON c.cliente_id = cl.id WHERE c.id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async registrarPago(credito_id, datos) {
    const { monto, tipo_pago, observaciones, usuario_id } = datos;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Obtener crédito
      const creditoResult = await client.query(
        'SELECT * FROM creditos WHERE id = $1',
        [credito_id]
      );
      const credito = creditoResult.rows[0];

      if (!credito) {
        throw new Error('Crédito no encontrado');
      }

      if (credito.estado === 'pagado') {
        throw new Error('El crédito ya está pagado');
      }

      if (monto > credito.monto_pendiente) {
        throw new Error('El monto excede el saldo pendiente');
      }

      // Registrar pago
      await client.query(
        'INSERT INTO pagos (credito_id, monto, tipo_pago, observaciones, usuario_id) VALUES ($1, $2, $3, $4, $5)',
        [credito_id, monto, tipo_pago, observaciones, usuario_id]
      );

      // Actualizar crédito
      const nuevoPagado = parseFloat(credito.monto_pagado) + parseFloat(monto);
      const nuevoPendiente = parseFloat(credito.monto_pendiente) - parseFloat(monto);
      let nuevoEstado = credito.estado;

      if (nuevoPendiente <= 0) {
        nuevoEstado = 'pagado';
      } else if (nuevoPagado > 0) {
        nuevoEstado = 'parcial';
      }

      await client.query(
        'UPDATE creditos SET monto_pagado = $1, monto_pendiente = $2, estado = $3 WHERE id = $4',
        [nuevoPagado, nuevoPendiente, nuevoEstado, credito_id]
      );

      await client.query('COMMIT');
      return { monto_pagado: nuevoPagado, monto_pendiente: nuevoPendiente, estado: nuevoEstado };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerPagos(credito_id) {
    const result = await pool.query(
      'SELECT p.*, u.nombre as usuario_nombre FROM pagos p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.credito_id = $1 ORDER BY p.fecha_pago DESC',
      [credito_id]
    );
    return result.rows;
  }

  static async obtenerDeudasPorCliente(cliente_id) {
    const result = await pool.query(
      'SELECT SUM(monto_pendiente) as total_deuda, COUNT(*) as total_creditos FROM creditos WHERE cliente_id = $1 AND estado IN ($2, $3)',
      [cliente_id, 'pendiente', 'parcial']
    );
    return result.rows[0];
  }

  static async obtenerDeudasVencidas() {
    const result = await pool.query(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono as cliente_telefono 
      FROM creditos c 
      JOIN clientes cl ON c.cliente_id = cl.id 
      WHERE c.estado IN ('pendiente', 'parcial') 
      AND c.fecha_limite < CURRENT_TIMESTAMP
      ORDER BY c.fecha_limite ASC
    `);
    return result.rows;
  }

  static async obtenerEstadisticas() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_creditos,
        SUM(monto_total) as total_prestado,
        SUM(monto_pagado) as total_pagado,
        SUM(monto_pendiente) as total_pendiente,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'parcial') as parciales,
        COUNT(*) FILTER (WHERE estado = 'pagado') as pagados,
        COUNT(*) FILTER (WHERE estado = 'vencido') as vencidos
      FROM creditos
    `);
    return result.rows[0];
  }
}

module.exports = Credito;
