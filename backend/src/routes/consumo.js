const express = require('express');
const router = express.Router();
const Consumo = require('../models/consumo');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');

// Listar consumo de clientes
router.get('/', auth, async (req, res) => {
  try {
    const { estado, alerta_pendiente } = req.query;
    const consumos = await Consumo.listar({ estado, alerta_pendiente });
    res.json(consumos);
  } catch (error) {
    console.error('Error al listar consumos:', error);
    res.status(500).json({ error: 'Error al listar consumos' });
  }
});

// Obtener alertas pendientes
router.get('/alertas', auth, async (req, res) => {
  try {
    const alertas = await Consumo.obtenerAlertasPendientes();
    res.json(alertas);
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

// Obtener clientes críticos
router.get('/criticos', auth, async (req, res) => {
  try {
    const criticos = await Consumo.obtenerClientesCriticos();
    res.json(criticos);
  } catch (error) {
    console.error('Error al obtener críticos:', error);
    res.status(500).json({ error: 'Error al obtener críticos' });
  }
});

// Obtener estadísticas de consumo
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const estadisticas = await Consumo.obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Buscar consumo de un cliente
router.get('/cliente/:cliente_id', auth, async (req, res) => {
  try {
    const consumo = await Consumo.buscarPorCliente(req.params.cliente_id);
    if (!consumo) {
      return res.status(404).json({ error: 'No hay registro de consumo para este cliente' });
    }
    res.json(consumo);
  } catch (error) {
    console.error('Error al buscar consumo:', error);
    res.status(500).json({ error: 'Error al buscar consumo' });
  }
});

// Crear registro de consumo para cliente
router.post('/cliente/:cliente_id', cajeroAuth, async (req, res) => {
  try {
    const { capacidad_total } = req.body;
    if (!capacidad_total || capacidad_total <= 0) {
      return res.status(400).json({ error: 'La capacidad total debe ser mayor a 0' });
    }
    const consumo = await Consumo.crear(req.params.cliente_id, capacidad_total);
    res.status(201).json(consumo);
  } catch (error) {
    console.error('Error al crear registro:', error);
    res.status(500).json({ error: 'Error al crear registro' });
  }
});

// Actualizar consumo de cliente
router.put('/cliente/:cliente_id', cajeroAuth, async (req, res) => {
  try {
    const { consumo_actual } = req.body;
    if (consumo_actual === undefined || consumo_actual < 0) {
      return res.status(400).json({ error: 'El consumo actual debe ser mayor o igual a 0' });
    }
    const consumo = await Consumo.actualizarConsumo(req.params.cliente_id, consumo_actual);
    res.json(consumo);
  } catch (error) {
    console.error('Error al actualizar consumo:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar consumo' });
  }
});

// Marcar alerta como enviada
router.patch('/cliente/:cliente_id/alerta', adminAuth, async (req, res) => {
  try {
    const consumo = await Consumo.marcarAlertaEnviada(req.params.cliente_id);
    res.json(consumo);
  } catch (error) {
    console.error('Error al marcar alerta:', error);
    res.status(500).json({ error: 'Error al marcar alerta' });
  }
});

// Actualizar capacidad total
router.put('/cliente/:cliente_id/capacidad', cajeroAuth, async (req, res) => {
  try {
    const { capacidad_total } = req.body;
    if (!capacidad_total || capacidad_total <= 0) {
      return res.status(400).json({ error: 'La capacidad total debe ser mayor a 0' });
    }
    const consumo = await Consumo.actualizarCapacidad(req.params.cliente_id, capacidad_total);
    res.json(consumo);
  } catch (error) {
    console.error('Error al actualizar capacidad:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar capacidad' });
  }
});

module.exports = router;
