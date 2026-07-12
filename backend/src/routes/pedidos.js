const express = require('express');
const router = express.Router();
const Pedido = require('../models/pedido');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const pedidoValidaciones = [
  body('cliente_id').notEmpty().withMessage('El cliente es requerido'),
  body('detalle').isArray({ min: 1 }).withMessage('Debe haber al menos un producto'),
  body('detalle.*.producto_id').notEmpty().withMessage('El producto es requerido'),
  body('detalle.*.cantidad').isInt({ gt: 0 }).withMessage('La cantidad debe ser mayor a 0'),
  body('detalle.*.precio_unitario').isFloat({ min: 0 }).withMessage('El precio unitario debe ser mayor o igual a 0')
];

router.get('/', auth, async (req, res) => {
  try {
    const { estado, cliente_id, fecha_desde, fecha_hasta } = req.query;
    const pedidos = await Pedido.listar({ estado, cliente_id, fecha_desde, fecha_hasta });
    res.json(pedidos);
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({ error: 'Error al listar pedidos' });
  }
});

router.get('/estadisticas', auth, async (req, res) => {
  try {
    const stats = await Pedido.obtenerEstadisticas();
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const pedido = await Pedido.buscarPorId(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (error) {
    console.error('Error al buscar pedido:', error);
    res.status(500).json({ error: 'Error al buscar pedido' });
  }
});

router.get('/:id/detalles', auth, async (req, res) => {
  try {
    const detalles = await Pedido.obtenerDetalles(req.params.id);
    res.json(detalles);
  } catch (error) {
    console.error('Error al obtener detalles:', error);
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
});

router.post('/', cajeroAuth, pedidoValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const pedido = await Pedido.crear({ ...req.body, usuario_id: req.user.id });
    res.status(201).json(pedido);
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: error.message || 'Error al crear pedido' });
  }
});

router.patch('/:id/estado', adminAuth, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['pendiente', 'entregado', 'cancelado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }
    const pedido = await Pedido.actualizarEstado(req.params.id, estado);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

module.exports = router;
