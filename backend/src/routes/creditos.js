const express = require('express');
const router = express.Router();
const Credito = require('../models/credito');
const { auth, cajeroAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Listar créditos
router.get('/', auth, async (req, res) => {
  try {
    const { cliente_id, estado, fecha_inicio, fecha_fin } = req.query;
    const creditos = await Credito.listar({ cliente_id, estado, fecha_inicio, fecha_fin });
    res.json(creditos);
  } catch (error) {
    console.error('Error al listar créditos:', error);
    res.status(500).json({ error: 'Error al listar créditos' });
  }
});

// Obtener deudas vencidas
router.get('/vencidos', auth, async (req, res) => {
  try {
    const deudas = await Credito.obtenerDeudasVencidas();
    res.json(deudas);
  } catch (error) {
    console.error('Error al obtener deudas vencidas:', error);
    res.status(500).json({ error: 'Error al obtener deudas vencidas' });
  }
});

// Obtener estadísticas de créditos
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const estadisticas = await Credito.obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Buscar crédito por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const credito = await Credito.buscarPorId(req.params.id);
    if (!credito) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }
    res.json(credito);
  } catch (error) {
    console.error('Error al buscar crédito:', error);
    res.status(500).json({ error: 'Error al buscar crédito' });
  }
});

// Obtener pagos de un crédito
router.get('/:id/pagos', auth, async (req, res) => {
  try {
    const pagos = await Credito.obtenerPagos(req.params.id);
    res.json(pagos);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// Obtener deudas por cliente
router.get('/cliente/:cliente_id/deuda', auth, async (req, res) => {
  try {
    const deuda = await Credito.obtenerDeudasPorCliente(req.params.cliente_id);
    res.json(deuda);
  } catch (error) {
    console.error('Error al obtener deuda:', error);
    res.status(500).json({ error: 'Error al obtener deuda' });
  }
});

// Registrar pago
router.post('/:id/pagos', cajeroAuth, async (req, res) => {
  try {
    const { monto, tipo_pago, observaciones } = req.body;
    
    if (!monto || monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    const resultado = await Credito.registrarPago(req.params.id, {
      monto,
      tipo_pago,
      observaciones,
      usuario_id: req.user.id
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: error.message || 'Error al registrar pago' });
  }
});

module.exports = router;
