const express = require('express');
const router = express.Router();
const Producto = require('../models/producto');
const { auth, cajeroAuth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validaciones
const productoValidaciones = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('unidad_medida').notEmpty().withMessage('La unidad de medida es requerida'),
  body('precio_venta').isFloat({ gt: 0 }).withMessage('El precio de venta debe ser mayor a 0'),
  body('categoria').notEmpty().withMessage('La categoría es requerida')
];

// Listar productos (por defecto solo activos)
router.get('/', auth, async (req, res) => {
  try {
    const { categoria, estado, buscar } = req.query;
    const productos = await Producto.listar({ categoria, estado: estado || 'activo', buscar });
    res.json(productos);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

// Obtener productos con stock bajo
router.get('/stock-bajo', auth, async (req, res) => {
  try {
    const productos = await Producto.obtenerStockBajo();
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener stock bajo:', error);
    res.status(500).json({ error: 'Error al obtener stock bajo' });
  }
});

// Obtener estadísticas de productos
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const estadisticas = await Producto.obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Buscar producto por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const producto = await Producto.buscarPorId(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error('Error al buscar producto:', error);
    res.status(500).json({ error: 'Error al buscar producto' });
  }
});

// Crear producto
router.post('/', cajeroAuth, productoValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const producto = await Producto.crear(req.body);
    res.status(201).json(producto);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Actualizar producto
router.put('/:id', cajeroAuth, async (req, res) => {
  try {
    const producto = await Producto.actualizar(req.params.id, req.body);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Actualizar stock
router.patch('/:id/stock', adminAuth, async (req, res) => {
  try {
    const { cantidad } = req.body;
    const producto = await Producto.actualizarStock(req.params.id, cantidad);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
});

// Eliminar producto (hard delete con fallback a inactivo si tiene registros)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const eliminado = await Producto.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;
