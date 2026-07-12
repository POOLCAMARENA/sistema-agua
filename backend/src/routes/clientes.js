const express = require('express');
const router = express.Router();
const Cliente = require('../models/cliente');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validaciones
const clienteValidaciones = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('telefono').notEmpty().withMessage('El teléfono es requerido'),
  body('direccion').notEmpty().withMessage('La dirección es requerida')
];

// Listar clientes
router.get('/', auth, async (req, res) => {
  try {
    const { estado, tipo_cliente, buscar } = req.query;
    const clientes = await Cliente.listar({ estado, tipo_cliente, buscar });
    res.json(clientes);
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ error: 'Error al listar clientes' });
  }
});

// Obtener estadísticas de clientes
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const estadisticas = await Cliente.obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Buscar cliente por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const cliente = await Cliente.buscarPorId(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('Error al buscar cliente:', error);
    res.status(500).json({ error: 'Error al buscar cliente' });
  }
});

// Crear cliente
router.post('/', cajeroAuth, clienteValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.body.dni_ruc) {
      const existente = await Cliente.buscarPorDniRuc(req.body.dni_ruc);
      if (existente) return res.status(400).json({ error: 'El DNI/RUC ya está registrado' });
    }

    const cliente = await Cliente.crear(req.body);
    res.status(201).json(cliente);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'El DNI/RUC ya está registrado' });
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Actualizar cliente
router.put('/:id', cajeroAuth, async (req, res) => {
  try {
    if (req.body.dni_ruc) {
      const existente = await Cliente.buscarPorDniRuc(req.body.dni_ruc);
      if (existente && existente.id !== parseInt(req.params.id)) return res.status(400).json({ error: 'El DNI/RUC ya está registrado' });
    }
    const cliente = await Cliente.actualizar(req.params.id, req.body);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'El DNI/RUC ya está registrado' });
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente (solo admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const eliminado = await Cliente.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;
