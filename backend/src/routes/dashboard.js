const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Obtener datos generales del dashboard
router.get('/', auth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    const fechaFin = fecha_fin || new Date().toISOString();

    // Ejecutar todas las consultas en paralelo
    const [
      ventasResult,
      ventasTipoPagoResult,
      comprasResult,
      clientesResult,
      productosResult,
      creditosResult,
      bidonesResult,
      consumoResult
    ] = await Promise.all([
      // Ventas del periodo
      pool.query(`
        SELECT 
          COUNT(*) as total_ventas,
          COUNT(*) FILTER (WHERE tipo_venta = 'contado') as ventas_contado,
          COUNT(*) FILTER (WHERE tipo_venta = 'credito') as ventas_credito,
          SUM(total) as total_ingresos
        FROM ventas
        WHERE fecha BETWEEN $1 AND $2 AND estado = 'completada'
      `, [fechaInicio, fechaFin]),

      // Ventas por tipo de pago
      pool.query(`
        SELECT tipo_pago, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
        FROM ventas WHERE fecha BETWEEN $1 AND $2 AND estado = 'completada'
        GROUP BY tipo_pago ORDER BY total DESC
      `, [fechaInicio, fechaFin]),

      // Compras del periodo
      pool.query(`
        SELECT 
          COUNT(*) as total_compras,
          SUM(total) as total_gastado
        FROM compras
        WHERE fecha BETWEEN $1 AND $2 AND estado = 'completada'
      `, [fechaInicio, fechaFin]),

      // Clientes
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estado = 'activo') as activos,
          COUNT(*) FILTER (WHERE tipo_cliente = 'vip') as vip
        FROM clientes
      `, []),

      // Productos
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estado = 'activo') as activos,
          SUM(stock_actual) as stock_total,
          COUNT(*) FILTER (WHERE stock_actual <= stock_minimo) as stock_bajo
        FROM productos
      `, []),

      // Créditos
      pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(monto_pendiente) as total_pendiente,
          COUNT(*) FILTER (WHERE estado = 'vencido') as vencidos
        FROM creditos
        WHERE estado IN ('pendiente', 'parcial', 'vencido')
      `, []),

      // Bidones
      pool.query(`
        SELECT 
          SUM(saldo_bidones) as saldo_actual,
          COUNT(*) FILTER (WHERE saldo_bidones > 0) as clientes_con_prestamo
        FROM bidones_cliente
      `, []),

      // Consumo
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estado = 'crítico') as criticos,
          COUNT(*) FILTER (WHERE estado = 'vacío') as vacios,
          COUNT(*) FILTER (WHERE alerta_enviada = false AND porcentaje_consumido >= 75) as alertas_pendientes
        FROM consumo_cliente
      `, [])
    ]);

    const dashboard = {
      ventas: ventasResult.rows[0],
      ventas_por_tipo_pago: ventasTipoPagoResult.rows,
      compras: comprasResult.rows[0],
      clientes: clientesResult.rows[0],
      productos: productosResult.rows[0],
      creditos: creditosResult.rows[0],
      bidones: bidonesResult.rows[0],
      consumo: consumoResult.rows[0],
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin
      }
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

// Obtener ventas por día (gráfico)
router.get('/ventas-diarias', auth, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const result = await pool.query(`
      SELECT 
        DATE(fecha) as fecha,
        COUNT(*) as total_ventas,
        SUM(total) as total_ingresos
      FROM ventas
      WHERE fecha >= CURRENT_DATE - MAKE_INTERVAL(days => $1::integer)
      AND estado = 'completada'
      GROUP BY DATE(fecha)
      ORDER BY fecha ASC
    `, [dias]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas diarias:', error);
    res.status(500).json({ error: 'Error al obtener ventas diarias' });
  }
});

// Obtener productos más vendidos
router.get('/productos-mas-vendidos', auth, async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    const result = await pool.query(`
      SELECT 
        p.nombre as producto,
        SUM(dv.cantidad) as total_vendido,
        SUM(dv.subtotal) as total_ingresos
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas v ON dv.venta_id = v.id
      WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'
      AND v.estado = 'completada'
      GROUP BY p.id, p.nombre
      ORDER BY total_vendido DESC
      LIMIT $1
    `, [limite]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    res.status(500).json({ error: 'Error al obtener productos más vendidos' });
  }
});

// Obtener repartidores con más ventas
router.get('/repartidores-top', auth, async (req, res) => {
  try {
    const { limite = 5 } = req.query;
    const result = await pool.query(`
      SELECT 
        r.nombre as repartidor,
        COUNT(v.id) as total_ventas,
        SUM(v.total) as total_ingresos,
        COUNT(DISTINCT v.cliente_id) as clientes_atendidos
      FROM ventas v
      JOIN repartidores r ON v.repartidor_id = r.id
      WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'
      AND v.estado = 'completada'
      GROUP BY r.id, r.nombre
      ORDER BY total_ingresos DESC
      LIMIT $1
    `, [limite]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener repartidores top:', error);
    res.status(500).json({ error: 'Error al obtener repartidores top' });
  }
});

module.exports = router;
