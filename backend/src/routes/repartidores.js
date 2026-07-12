const express = require('express');
const router = express.Router();
const Repartidor = require('../models/repartidor');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validaciones
const repartidorValidaciones = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('telefono').notEmpty().withMessage('El teléfono es requerido')
];

// Listar repartidores
router.get('/', auth, async (req, res) => {
  try {
    const { estado } = req.query;
    const repartidores = await Repartidor.listar({ estado });
    res.json(repartidores);
  } catch (error) {
    console.error('Error al listar repartidores:', error);
    res.status(500).json({ error: 'Error al listar repartidores' });
  }
});

// Buscar repartidor por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const repartidor = await Repartidor.buscarPorId(req.params.id);
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }
    res.json(repartidor);
  } catch (error) {
    console.error('Error al buscar repartidor:', error);
    res.status(500).json({ error: 'Error al buscar repartidor' });
  }
});

// Obtener estadísticas de ventas por repartidor
router.get('/:id/estadisticas', auth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    const fechaFin = fecha_fin || new Date().toISOString();
    const estadisticas = await Repartidor.obtenerEstadisticasVentas(req.params.id, fechaInicio, fechaFin);
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Crear repartidor
router.post('/', cajeroAuth, repartidorValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const repartidor = await Repartidor.crear(req.body);
    res.status(201).json(repartidor);
  } catch (error) {
    console.error('Error al crear repartidor:', error);
    res.status(500).json({ error: 'Error al crear repartidor' });
  }
});

// Actualizar repartidor
router.put('/:id', cajeroAuth, async (req, res) => {
  try {
    const repartidor = await Repartidor.actualizar(req.params.id, req.body);
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }
    res.json(repartidor);
  } catch (error) {
    console.error('Error al actualizar repartidor:', error);
    res.status(500).json({ error: 'Error al actualizar repartidor' });
  }
});

// Eliminar repartidor (soft delete)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const eliminado = await Repartidor.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }
    res.json({ message: 'Repartidor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar repartidor:', error);
    res.status(500).json({ error: 'Error al eliminar repartidor' });
  }
});

module.exports = router;
