const express = require('express');
const router = express.Router();
const Compra = require('../models/compra');
const pool = require('../config/database');
const { auth, adminAuth, cajeroAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validaciones
const compraValidaciones = [
  body('proveedor_id').notEmpty().withMessage('El proveedor es requerido'),
  body('detalle').isArray({ min: 1 }).withMessage('Debe haber al menos un producto'),
  body('detalle.*.producto_id').notEmpty().withMessage('El producto es requerido'),
  body('detalle.*.cantidad').isInt({ gt: 0 }).withMessage('La cantidad debe ser mayor a 0'),
  body('detalle.*.precio_unitario').isFloat({ gt: 0 }).withMessage('El precio unitario debe ser mayor a 0')
];

// Listar compras
router.get('/', auth, async (req, res) => {
  try {
    const { proveedor_id, tipo_pago, fecha_inicio, fecha_fin, estado } = req.query;
    const compras = await Compra.listar({ proveedor_id, tipo_pago, fecha_inicio, fecha_fin, estado });
    res.json(compras);
  } catch (error) {
    console.error('Error al listar compras:', error);
    res.status(500).json({ error: 'Error al listar compras' });
  }
});

// Obtener estadísticas de compras
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    const fechaFin = fecha_fin || new Date().toISOString();
    const estadisticas = await Compra.obtenerEstadisticas(fechaInicio, fechaFin);
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Buscar compra por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const compra = await Compra.buscarPorId(req.params.id);
    if (!compra) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    res.json(compra);
  } catch (error) {
    console.error('Error al buscar compra:', error);
    res.status(500).json({ error: 'Error al buscar compra' });
  }
});

// Obtener detalles de compra
router.get('/:id/detalles', auth, async (req, res) => {
  try {
    const detalles = await Compra.obtenerDetalles(req.params.id);
    res.json(detalles);
  } catch (error) {
    console.error('Error al obtener detalles:', error);
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
});

// Crear compra
router.post('/', cajeroAuth, compraValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const compra = await Compra.crear({
      ...req.body,
      usuario_id: req.user.id
    });
    res.status(201).json(compra);
  } catch (error) {
    console.error('Error al crear compra:', error);
    res.status(500).json({ error: error.message || 'Error al crear compra' });
  }
});

// Cambiar estado (solo admin)
router.patch('/:id/estado', adminAuth, async (req, res) => {
  try {
    const { estado } = req.body;
    const compra = await Compra.actualizarEstado(req.params.id, estado);
    if (!compra) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    res.json(compra);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// Eliminar compra (solo admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const compra = await Compra.buscarPorId(req.params.id);
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    await pool.query('DELETE FROM detalle_compras WHERE compra_id = $1', [req.params.id]);
    await pool.query('DELETE FROM compras WHERE id = $1', [req.params.id]);
    res.json({ message: 'Compra eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar compra:', error);
    res.status(500).json({ error: 'Error al eliminar compra' });
  }
});

module.exports = router;
