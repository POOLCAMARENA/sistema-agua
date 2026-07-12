const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Listar rutas
router.get('/', auth, async (req, res) => {
  try {
    const { estado } = req.query;
    let query = `
      SELECT r.*, rep.nombre as repartidor_nombre 
      FROM rutas r 
      LEFT JOIN repartidores rep ON r.repartidor_id = rep.id 
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND r.estado = $1';
      params.push(estado);
    }

    query += ' ORDER BY r.nombre';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar rutas:', error);
    res.status(500).json({ error: 'Error al listar rutas' });
  }
});

// Buscar ruta por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT r.*, rep.nombre as repartidor_nombre FROM rutas r LEFT JOIN repartidores rep ON r.repartidor_id = rep.id WHERE r.id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al buscar ruta:', error);
    res.status(500).json({ error: 'Error al buscar ruta' });
  }
});

// Obtener clientes de una ruta
router.get('/:id/clientes', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, c.nombre, c.telefono, c.direccion 
      FROM clientes_ruta cr 
      JOIN clientes c ON cr.cliente_id = c.id 
      WHERE cr.ruta_id = $1 
      ORDER BY cr.orden_visita`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Crear ruta
router.post('/', cajeroAuth, async (req, res) => {
  try {
    const { nombre, descripcion, repartidor_id } = req.body;
    const result = await pool.query(
      'INSERT INTO rutas (nombre, descripcion, repartidor_id) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descripcion, repartidor_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(500).json({ error: 'Error al crear ruta' });
  }
});

// Asignar cliente a ruta
router.post('/:id/clientes', cajeroAuth, async (req, res) => {
  try {
    const { cliente_id, orden_visita } = req.body;
    const result = await pool.query(
      'INSERT INTO clientes_ruta (ruta_id, cliente_id, orden_visita) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, cliente_id, orden_visita || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al asignar cliente:', error);
    res.status(500).json({ error: 'Error al asignar cliente' });
  }
});

// Actualizar ruta
router.put('/:id', cajeroAuth, async (req, res) => {
  try {
    const { nombre, descripcion, repartidor_id, estado } = req.body;
    const result = await pool.query(
      'UPDATE rutas SET nombre = $1, descripcion = $2, repartidor_id = $3, estado = $4 WHERE id = $5 RETURNING *',
      [nombre, descripcion, repartidor_id, estado, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar ruta:', error);
    res.status(500).json({ error: 'Error al actualizar ruta' });
  }
});

// Eliminar cliente de ruta
router.delete('/:id/clientes/:cliente_id', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM clientes_ruta WHERE ruta_id = $1 AND cliente_id = $2',
      [req.params.id, req.params.cliente_id]
    );
    res.json({ message: 'Cliente eliminado de ruta' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;
