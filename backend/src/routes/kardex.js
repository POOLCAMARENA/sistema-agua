const express = require('express');
const router = express.Router();
const Kardex = require('../models/kardex');
const { auth, cajeroAuth } = require('../middleware/auth');

// Listar movimientos de kardex
router.get('/', auth, async (req, res) => {
  try {
    const { producto_id, tipo_movimiento, fecha_inicio, fecha_fin } = req.query;
    const movimientos = await Kardex.listar({ producto_id, tipo_movimiento, fecha_inicio, fecha_fin });
    res.json(movimientos);
  } catch (error) {
    console.error('Error al listar kardex:', error);
    res.status(500).json({ error: 'Error al listar kardex' });
  }
});

// Obtener reporte de kardex
router.get('/reporte', auth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    const fechaFin = fecha_fin || new Date().toISOString();
    const reporte = await Kardex.obtenerReporte(fechaInicio, fechaFin);
    res.json(reporte);
  } catch (error) {
    console.error('Error al obtener reporte:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});

// Buscar movimiento por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const movimiento = await Kardex.buscarPorId(req.params.id);
    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    res.json(movimiento);
  } catch (error) {
    console.error('Error al buscar movimiento:', error);
    res.status(500).json({ error: 'Error al buscar movimiento' });
  }
});

// Obtener movimientos por producto
router.get('/producto/:producto_id', auth, async (req, res) => {
  try {
    const { limite } = req.query;
    const movimientos = await Kardex.obtenerMovimientosPorProducto(req.params.producto_id, limite || 50);
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// Registrar movimiento manual (ajuste)
router.post('/', cajeroAuth, async (req, res) => {
  try {
    const movimiento = await Kardex.registrarMovimiento(req.body);
    res.status(201).json(movimiento);
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ error: error.message || 'Error al registrar movimiento' });
  }
});

module.exports = router;
