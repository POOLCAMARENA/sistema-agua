const express = require('express');
const router = express.Router();
const Proveedor = require('../models/proveedor');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validaciones
const proveedorValidaciones = [
  body('nombre').notEmpty().withMessage('El nombre es requerido')
];

// Listar proveedores
router.get('/', auth, async (req, res) => {
  try {
    const { estado } = req.query;
    const proveedores = await Proveedor.listar({ estado });
    res.json(proveedores);
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({ error: 'Error al listar proveedores' });
  }
});

// Buscar proveedor por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const proveedor = await Proveedor.buscarPorId(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(proveedor);
  } catch (error) {
    console.error('Error al buscar proveedor:', error);
    res.status(500).json({ error: 'Error al buscar proveedor' });
  }
});

// Crear proveedor
router.post('/', cajeroAuth, proveedorValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const proveedor = await Proveedor.crear(req.body);
    res.status(201).json(proveedor);
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// Actualizar proveedor
router.put('/:id', cajeroAuth, async (req, res) => {
  try {
    const proveedor = await Proveedor.actualizar(req.params.id, req.body);
    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(proveedor);
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// Eliminar proveedor (solo admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const eliminado = await Proveedor.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json({ message: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

module.exports = router;
