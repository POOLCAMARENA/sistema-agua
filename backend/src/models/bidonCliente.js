const pool = require('../config/database');

class BidonCliente {
  static async registrarMovimiento(cliente_id, tipo, cantidad, usuario_id) {
    await pool.query(
      'INSERT INTO movimientos_bidones (cliente_id, tipo, cantidad, usuario_id) VALUES ($1, $2, $3, $4)',
      [cliente_id, tipo, cantidad, usuario_id || null]
    );
  }

  static async crear(cliente_id) {
    const result = await pool.query(
      'INSERT INTO bidones_cliente (cliente_id, saldo_bidones) VALUES ($1, 0) RETURNING *',
      [cliente_id]
    );
    return result.rows[0];
  }

  static async buscarPorCliente(cliente_id) {
    const result = await pool.query(
      'SELECT * FROM bidones_cliente WHERE cliente_id = $1',
      [cliente_id]
    );
    return result.rows[0];
  }

  static async registrarEntrega(cliente_id, cantidad, usuario_id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Obtener registro actual o crear uno nuevo
      let bidonCliente = await client.query(
        'SELECT * FROM bidones_cliente WHERE cliente_id = $1',
        [cliente_id]
      );

      if (!bidonCliente.rows[0]) {
        bidonCliente = await client.query(
          'INSERT INTO bidones_cliente (cliente_id, bidones_entregados, saldo_bidones) VALUES ($1, $2, $2) RETURNING *',
          [cliente_id, cantidad]
        );
      } else {
        bidonCliente = await client.query(
          'UPDATE bidones_cliente SET bidones_entregados = bidones_entregados + $1, saldo_bidones = saldo_bidones + $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE cliente_id = $2 RETURNING *',
          [cantidad, cliente_id]
        );
      }

      await client.query(
        'INSERT INTO movimientos_bidones (cliente_id, tipo, cantidad, usuario_id) VALUES ($1, $2, $3, $4)',
        [cliente_id, 'entrega', cantidad, usuario_id || null]
      );

      await client.query('COMMIT');
      return bidonCliente.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async registrarRetorno(cliente_id, cantidad, usuario_id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const bidonCliente = await client.query(
        'SELECT * FROM bidones_cliente WHERE cliente_id = $1',
        [cliente_id]
      );

      if (!bidonCliente.rows[0]) {
        throw new Error('No hay registro de bidones para este cliente');
      }

      const saldoActual = bidonCliente.rows[0].saldo_bidones;
      if (cantidad > saldoActual) {
        throw new Error('La cantidad a retornar excede el saldo actual');
      }

      const resultado = await client.query(
        'UPDATE bidones_cliente SET bidones_retornados = bidones_retornados + $1, saldo_bidones = saldo_bidones - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE cliente_id = $2 RETURNING *',
        [cantidad, cliente_id]
      );

      await client.query(
        'INSERT INTO movimientos_bidones (cliente_id, tipo, cantidad, usuario_id) VALUES ($1, $2, $3, $4)',
        [cliente_id, 'retorno', cantidad, usuario_id || null]
      );

      await client.query('COMMIT');
      return resultado.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async registrarPerdida(cliente_id, cantidad, usuario_id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const bidonCliente = await client.query(
        'SELECT * FROM bidones_cliente WHERE cliente_id = $1',
        [cliente_id]
      );

      if (!bidonCliente.rows[0]) {
        throw new Error('No hay registro de bidones para este cliente');
      }

      const saldoActual = bidonCliente.rows[0].saldo_bidones;
      if (cantidad > saldoActual) {
        throw new Error('La cantidad perdida excede el saldo actual');
      }

      const resultado = await client.query(
        'UPDATE bidones_cliente SET bidones_perdidos = bidones_perdidos + $1, saldo_bidones = saldo_bidones - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE cliente_id = $2 RETURNING *',
        [cantidad, cliente_id]
      );

      await client.query(
        'INSERT INTO movimientos_bidones (cliente_id, tipo, cantidad, usuario_id) VALUES ($1, $2, $3, $4)',
        [cliente_id, 'perdida', cantidad, usuario_id || null]
      );

      await client.query('COMMIT');
      return resultado.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async listar({ saldo_minimo } = {}) {
    let query = `
      SELECT bc.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion 
      FROM bidones_cliente bc 
      JOIN clientes c ON bc.cliente_id = c.id 
      WHERE c.estado = 'activo'
    `;
    const params = [];

    if (saldo_minimo !== undefined) {
      query += ' AND bc.saldo_bidones >= $1';
      params.push(saldo_minimo);
    }

    query += ' ORDER BY bc.saldo_bidones DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async obtenerClientesConBidonesPrestados() {
    const result = await pool.query(`
      SELECT bc.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion 
      FROM bidones_cliente bc 
      JOIN clientes c ON bc.cliente_id = c.id 
      WHERE bc.saldo_bidones > 0 AND c.estado = 'activo'
      ORDER BY bc.saldo_bidones DESC
    `);
    return result.rows;
  }

  static async obtenerEstadisticas() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_clientes,
        SUM(bidones_entregados) as total_entregados,
        SUM(bidones_retornados) as total_retornados,
        SUM(bidones_perdidos) as total_perdidos,
        SUM(saldo_bidones) as saldo_actual,
        COUNT(*) FILTER (WHERE saldo_bidones > 0) as clientes_con_prestamo
      FROM bidones_cliente
    `);
    return result.rows[0];
  }

  static async actualizar(cliente_id, datos) {
    const { bidones_entregados, bidones_retornados, bidones_perdidos } = datos;
    const entregados = bidones_entregados ?? 0;
    const retornados = bidones_retornados ?? 0;
    const perdidos = bidones_perdidos ?? 0;
    const saldo = entregados - retornados - perdidos;

    if (saldo < 0) {
      throw new Error('El saldo no puede ser negativo. Verifica los valores ingresados.');
    }

    const result = await pool.query(
      `UPDATE bidones_cliente SET 
        bidones_entregados = $1, 
        bidones_retornados = $2, 
        bidones_perdidos = $3, 
        saldo_bidones = $4,
        fecha_actualizacion = CURRENT_TIMESTAMP 
      WHERE cliente_id = $5 RETURNING *`,
      [entregados, retornados, perdidos, saldo, cliente_id]
    );

    if (!result.rows[0]) {
      throw new Error('No hay registro de bidones para este cliente');
    }
    return result.rows[0];
  }

  static async eliminar(cliente_id) {
    const result = await pool.query(
      'DELETE FROM bidones_cliente WHERE cliente_id = $1 RETURNING *',
      [cliente_id]
    );
    if (!result.rows[0]) {
      throw new Error('No hay registro de bidones para este cliente');
    }
    return result.rows[0];
  }

  static async listarMovimientos(tipo, { fecha_inicio, fecha_fin } = {}) {
    let query = `
      SELECT mb.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
      FROM movimientos_bidones mb
      JOIN clientes c ON mb.cliente_id = c.id
      WHERE mb.tipo = $1
    `;
    const params = [tipo];
    let idx = 2;

    if (fecha_inicio) {
      query += ` AND mb.fecha >= $${idx}`;
      params.push(fecha_inicio);
      idx++;
    }
    if (fecha_fin) {
      query += ` AND mb.fecha <= $${idx}`;
      params.push(fecha_fin);
      idx++;
    }

    query += ' ORDER BY mb.fecha DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async listarMovimientosPorCliente(cliente_id) {
    const result = await pool.query(
      `SELECT mb.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
       FROM movimientos_bidones mb
       JOIN clientes c ON mb.cliente_id = c.id
       WHERE mb.cliente_id = $1
       ORDER BY mb.fecha DESC`,
      [cliente_id]
    );
    return result.rows;
  }
}

module.exports = BidonCliente;
