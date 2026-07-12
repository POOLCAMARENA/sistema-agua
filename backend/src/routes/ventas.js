const express = require('express');
const router = express.Router();
const Venta = require('../models/venta');
const pool = require('../config/database');
const { auth, adminAuth, cajeroAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validaciones
const ventaValidaciones = [
  body('cliente_id').notEmpty().withMessage('El cliente es requerido'),
  body('tipo_venta').isIn(['contado', 'credito']).withMessage('Tipo de venta inválido'),
  body('detalle').isArray({ min: 1 }).withMessage('Debe haber al menos un producto'),
  body('detalle.*.producto_id').notEmpty().withMessage('El producto es requerido'),
  body('detalle.*.cantidad').isInt({ gt: 0 }).withMessage('La cantidad debe ser mayor a 0'),
  body('detalle.*.precio_unitario').isFloat({ gt: 0 }).withMessage('El precio unitario debe ser mayor a 0'),
  body('dias_plazo').optional().isInt({ gt: 0 }).withMessage('Días de plazo debe ser un número positivo')
];

// Listar ventas
router.get('/', auth, async (req, res) => {
  try {
    const { cliente_id, repartidor_id, tipo_venta, fecha_inicio, fecha_fin, estado } = req.query;
    const ventas = await Venta.listar({ cliente_id, repartidor_id, tipo_venta, fecha_inicio, fecha_fin, estado });
    res.json(ventas);
  } catch (error) {
    console.error('Error al listar ventas:', error);
    res.status(500).json({ error: 'Error al listar ventas' });
  }
});

// Obtener estadísticas de ventas
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    const fechaFin = fecha_fin || new Date().toISOString();
    const estadisticas = await Venta.obtenerEstadisticas(fechaInicio, fechaFin);
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Buscar venta por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const venta = await Venta.buscarPorId(req.params.id);
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(venta);
  } catch (error) {
    console.error('Error al buscar venta:', error);
    res.status(500).json({ error: 'Error al buscar venta' });
  }
});

// Obtener detalles de venta
router.get('/:id/detalles', auth, async (req, res) => {
  try {
    const detalles = await Venta.obtenerDetalles(req.params.id);
    res.json(detalles);
  } catch (error) {
    console.error('Error al obtener detalles:', error);
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
});

// Crear venta
router.post('/', cajeroAuth, ventaValidaciones, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const venta = await Venta.crear({
      ...req.body,
      usuario_id: req.user.id
    });
    res.status(201).json(venta);
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ error: error.message || 'Error al crear venta' });
  }
});

// Reportes de ventas
router.get('/reportes/:periodo', auth, async (req, res) => {
  try {
    const { periodo } = req.params;
    const { fecha_inicio, fecha_fin, anio, mes } = req.query;
    let query, params;

    if (periodo === 'diario') {
      const fecha = fecha_inicio || new Date().toISOString().split('T')[0];
      query = `
        SELECT EXTRACT(HOUR FROM fecha) as hora, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE fecha::date = $1 AND estado = 'completada'
        GROUP BY hora ORDER BY hora
      `;
      params = [fecha];
    } else if (periodo === 'semanal') {
      const inicio = fecha_inicio || new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
      const fin = fecha_fin || new Date().toISOString().split('T')[0];
      query = `
        SELECT fecha::date as dia, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE fecha::date BETWEEN $1 AND $2 AND estado = 'completada'
        GROUP BY dia ORDER BY dia
      `;
      params = [inicio, fin];
    } else if (periodo === 'mensual') {
      const year = anio || new Date().getFullYear();
      const month = mes || new Date().getMonth() + 1;
      query = `
        SELECT EXTRACT(DAY FROM fecha) as dia, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE EXTRACT(YEAR FROM fecha) = $1 AND EXTRACT(MONTH FROM fecha) = $2 AND estado = 'completada'
        GROUP BY dia ORDER BY dia
      `;
      params = [year, month];
    } else if (periodo === 'anual') {
      const year = anio || new Date().getFullYear();
      query = `
        SELECT EXTRACT(MONTH FROM fecha) as mes, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE EXTRACT(YEAR FROM fecha) = $1 AND estado = 'completada'
        GROUP BY mes ORDER BY mes
      `;
      params = [year];
    } else {
      return res.status(400).json({ error: 'Periodo no válido. Use: diario, semanal, mensual, anual' });
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// Reportes por tipo de pago
router.get('/reportes/tipo-pago', auth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const inicio = fecha_inicio || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const fin = fecha_fin || new Date().toISOString().split('T')[0];
    const result = await pool.query(`
      SELECT tipo_pago, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM ventas WHERE fecha::date BETWEEN $1 AND $2 AND estado = 'completada'
      GROUP BY tipo_pago ORDER BY total DESC
    `, [inicio, fin]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al generar reporte por tipo de pago:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// Actualizar estado de venta (solo admin)
router.patch('/:id/estado', adminAuth, async (req, res) => {
  try {
    const { estado } = req.body;
    const venta = await Venta.actualizarEstado(req.params.id, estado);
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    res.json(venta);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// Eliminar venta (solo admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const venta = await Venta.buscarPorId(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    await pool.query('DELETE FROM detalle_ventas WHERE venta_id = $1', [req.params.id]);
    await pool.query('DELETE FROM ventas WHERE id = $1', [req.params.id]);
    res.json({ message: 'Venta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar venta:', error);
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
});

module.exports = router;
