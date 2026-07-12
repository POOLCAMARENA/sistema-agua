const express = require('express');
const router = express.Router();
const BidonCliente = require('../models/bidonCliente');
const { auth, cajeroAuth } = require('../middleware/auth');

// Listar bidones por cliente
router.get('/', auth, async (req, res) => {
  try {
    const { saldo_minimo } = req.query;
    const bidones = await BidonCliente.listar({ saldo_minimo });
    res.json(bidones);
  } catch (error) {
    console.error('Error al listar bidones:', error);
    res.status(500).json({ error: 'Error al listar bidones' });
  }
});

// Obtener clientes con bidones prestados
router.get('/prestados', auth, async (req, res) => {
  try {
    const clientes = await BidonCliente.obtenerClientesConBidonesPrestados();
    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes con préstamo:', error);
    res.status(500).json({ error: 'Error al obtener clientes con préstamo' });
  }
});

// Obtener estadísticas de bidones
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const estadisticas = await BidonCliente.obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Buscar bidones de un cliente
router.get('/cliente/:cliente_id', auth, async (req, res) => {
  try {
    const bidon = await BidonCliente.buscarPorCliente(req.params.cliente_id);
    if (!bidon) {
      return res.status(404).json({ error: 'No hay registro de bidones para este cliente' });
    }
    res.json(bidon);
  } catch (error) {
    console.error('Error al buscar bidones:', error);
    res.status(500).json({ error: 'Error al buscar bidones' });
  }
});

// Crear registro de bidones para cliente
router.post('/cliente/:cliente_id', cajeroAuth, async (req, res) => {
  try {
    const bidon = await BidonCliente.crear(req.params.cliente_id);
    res.status(201).json(bidon);
  } catch (error) {
    console.error('Error al crear registro:', error);
    res.status(500).json({ error: 'Error al crear registro' });
  }
});

// Registrar entrega de bidones
router.post('/cliente/:cliente_id/entrega', cajeroAuth, async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }
    const bidon = await BidonCliente.registrarEntrega(req.params.cliente_id, cantidad);
    res.json(bidon);
  } catch (error) {
    console.error('Error al registrar entrega:', error);
    res.status(500).json({ error: error.message || 'Error al registrar entrega' });
  }
});

// Registrar retorno de bidones
router.post('/cliente/:cliente_id/retorno', cajeroAuth, async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }
    const bidon = await BidonCliente.registrarRetorno(req.params.cliente_id, cantidad);
    res.json(bidon);
  } catch (error) {
    console.error('Error al registrar retorno:', error);
    res.status(500).json({ error: error.message || 'Error al registrar retorno' });
  }
});

// Registrar pérdida de bidones
router.post('/cliente/:cliente_id/perdida', cajeroAuth, async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }
    const bidon = await BidonCliente.registrarPerdida(req.params.cliente_id, cantidad);
    res.json(bidon);
  } catch (error) {
    console.error('Error al registrar pérdida:', error);
    res.status(500).json({ error: error.message || 'Error al registrar pérdida' });
  }
});

module.exports = router;
