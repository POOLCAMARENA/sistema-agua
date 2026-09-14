const express = require('express');
const router = express.Router();
const Programacion = require('../models/programacion');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const programacionValidaciones = [
  body('cliente_id').notEmpty().withMessage('El cliente es requerido'),
  body('fecha_programada').notEmpty().withMessage('La fecha es requerida'),
  body('hora_programada').notEmpty().withMessage('La hora es requerida')
];

router.get('/', auth, async (req, res) => {
  try {
    const { estado, cliente_id, ruta_id, fecha_desde, fecha_hasta } = req.query;
    const programaciones = await Programacion.listar({ estado, cliente_id, ruta_id, fecha_desde, fecha_hasta });
    res.json(programaciones);
  } catch (error) {
    console.error('Error al listar programaciones:', error);
    res.status(500).json({ error: 'Error al listar programaciones' });
  }
});

router.get('/estadisticas', auth, async (req, res) => {
  try {
    const stats = await Programacion.obtenerEstadisticas();
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const programacion = await Programacion.buscarPorId(req.params.id);
    if (!programacion) return res.status(404).json({ error: 'Programación no encontrada' });
    res.json(programacion);
  } catch (error) {
    console.error('Error al buscar programación:', error);
    res.status(500).json({ error: 'Error al buscar programación' });
  }
});

router.get('/:id/detalles', auth, async (req, res) => {
  try {
    const detalles = await Programacion.obtenerDetalles(req.params.id);
    res.json(detalles);
  } catch (error) {
    console.error('Error al obtener detalles:', error);
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
});

router.post('/', cajeroAuth, programacionValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const programacion = await Programacion.crear({ ...req.body, usuario_id: req.user.id });
    res.status(201).json(programacion);
  } catch (error) {
    console.error('Error al crear programación:', error);
    res.status(500).json({ error: error.message || 'Error al crear programación' });
  }
});

router.patch('/:id/estado', cajeroAuth, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['pendiente', 'completada', 'cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }
    const programacion = await Programacion.actualizarEstado(req.params.id, estado);
    if (!programacion) return res.status(404).json({ error: 'Programación no encontrada' });
    res.json(programacion);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const programacion = await Programacion.eliminar(req.params.id);
    if (!programacion) return res.status(404).json({ error: 'Programación no encontrada' });
    res.json({ message: 'Programación eliminada' });
  } catch (error) {
    console.error('Error al eliminar programación:', error);
    res.status(500).json({ error: 'Error al eliminar programación' });
  }
});

module.exports = router;
