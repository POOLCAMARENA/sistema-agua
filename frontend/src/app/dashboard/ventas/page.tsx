'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { Venta, DetalleVenta, Producto, Cliente, Repartidor } from '@/types';
import {
  ShoppingCart,
  Plus,
  Eye,
  Search,
  CreditCard,
  X,
  DollarSign,
  Calendar,
  User,
  Package,
  ChevronDown,
  Save,
  ArrowLeft,
  Trash2,
  Loader2,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuthStore } from '@/lib/store';

interface DetalleRow {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  producto_nombre?: string;
}

interface Estadisticas {
  total_ventas: number;
  ventas_contado: number;
  ventas_credito: number;
  total_ingresos: number;
  ticket_promedio: number;
}

export default function VentasPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const esAdmin = usuario?.rol === 'admin';
  const [mode, setMode] = useState<'list' | 'create' | 'reportes'>('list');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [search, setSearch] = useState('');

  // Detail modal
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [detalles, setDetalles] = useState<DetalleVenta[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);

  // Reportes
  const [reportePeriodo, setReportePeriodo] = useState<'diario' | 'semanal' | 'mensual' | 'anual'>('diario');
  const [reporteData, setReporteData] = useState<any[]>([]);
  const [reporteLoading, setReporteLoading] = useState(false);
  const [reporteFecha, setReporteFecha] = useState(new Date().toISOString().split('T')[0]);
  const [reporteAnio, setReporteAnio] = useState(new Date().getFullYear());
  const [reporteMes, setReporteMes] = useState(new Date().getMonth() + 1);
  const [reporteTipoPago, setReporteTipoPago] = useState<any[]>([]);

  // Create form
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    repartidor_id: '',
    tipo_venta: 'contado' as 'contado' | 'credito',
    tipo_pago: 'efectivo' as 'efectivo' | 'yape' | 'transferencia' | 'plin',
    dias_plazo: 30,
    observaciones: '',
  });
  const [detalleRows, setDetalleRows] = useState<DetalleRow[]>([
    { producto_id: 0, cantidad: 1, precio_unitario: 0 },
  ]);

  const fetchVentas = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (search) params.cliente_nombre = search;
      const response = await api.get('/ventas', { params });
      setVentas(response.data);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, search]);

  const fetchEstadisticas = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      const response = await api.get('/ventas/estadisticas', { params });
      setEstadisticas(response.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }, [fechaInicio, fechaFin]);

  const fetchFormData = useCallback(async () => {
    try {
      const [clientesRes, repartidoresRes, productosRes] = await Promise.all([
        api.get('/clientes'),
        api.get('/repartidores'),
        api.get('/productos'),
      ]);
      setClientes(clientesRes.data);
      setRepartidores(repartidoresRes.data);
      setProductos(productosRes.data);
    } catch (error) {
      console.error('Error al cargar datos del formulario:', error);
    }
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      fetchVentas();
      fetchEstadisticas();
    }
  }, [mode, fetchVentas, fetchEstadisticas]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta venta?')) return;
    try {
      await api.delete(`/ventas/${id}`);
      fetchVentas();
      fetchEstadisticas();
    } catch {
      alert('Error al eliminar venta');
    }
  };

  const handleFilter = () => {
    fetchVentas();
    fetchEstadisticas();
  };

  const openDetail = async (venta: Venta) => {
    setSelectedVenta(venta);
    setLoadingDetalles(true);
    try {
      const response = await api.get(`/ventas/${venta.id}/detalles`);
      setDetalles(response.data);
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    } finally {
      setLoadingDetalles(false);
    }
  };

  const closeDetail = () => {
    setSelectedVenta(null);
    setDetalles([]);
  };

  const fetchReporte = useCallback(async () => {
    setReporteLoading(true);
    try {
      const params: any = {};
      if (reportePeriodo === 'diario') { params.fecha_inicio = reporteFecha; params.fecha_fin = reporteFecha; }
      if (reportePeriodo === 'semanal') {
        const fin = reporteFecha;
        const inicio = new Date(new Date(fin).setDate(new Date(fin).getDate() - 6)).toISOString().split('T')[0];
        params.fecha_inicio = inicio;
        params.fecha_fin = fin;
      }
      if (reportePeriodo === 'mensual') {
        const ultimoDia = new Date(reporteAnio, reporteMes, 0).getDate();
        params.fecha_inicio = `${reporteAnio}-${String(reporteMes).padStart(2, '0')}-01`;
        params.fecha_fin = `${reporteAnio}-${String(reporteMes).padStart(2, '0')}-${ultimoDia}`;
      }
      if (reportePeriodo === 'anual') {
        params.fecha_inicio = `${reporteAnio}-01-01`;
        params.fecha_fin = `${reporteAnio}-12-31`;
      }
      const [resPeriodo, resTipoPago] = await Promise.all([
        api.get(`/ventas/reportes/${reportePeriodo}`, { params }),
        api.get('/ventas/reportes/tipo-pago', { params }),
      ]);
      setReporteData(resPeriodo.data);
      setReporteTipoPago(resTipoPago.data);
    } catch (err) {
      console.error('Error al cargar reporte:', err);
    } finally {
      setReporteLoading(false);
    }
  }, [reportePeriodo, reporteFecha, reporteAnio, reporteMes]);

  const switchToCreate = () => {
    setMode('create');
    fetchFormData();
  };

  const switchToList = () => {
    setMode('list');
    setFormData({
      cliente_id: '',
      repartidor_id: '',
      tipo_venta: 'contado',
      tipo_pago: 'efectivo',
      dias_plazo: 30,
      observaciones: '',
    });
    setDetalleRows([{ producto_id: 0, cantidad: 1, precio_unitario: 0 }]);
  };

  const handleProductChange = (index: number, productoId: number) => {
    const producto = productos.find((p) => p.id === productoId);
    const newRows = [...detalleRows];
    newRows[index] = {
      producto_id: productoId,
      cantidad: 1,
      precio_unitario: producto?.precio_venta || 0,
      producto_nombre: producto?.nombre,
    };
    setDetalleRows(newRows);
  };

  const handleCantidadChange = (index: number, cantidad: number) => {
    const newRows = [...detalleRows];
    newRows[index] = { ...newRows[index], cantidad };
    setDetalleRows(newRows);
  };

  const handlePrecioChange = (index: number, precio: number) => {
    const newRows = [...detalleRows];
    newRows[index] = { ...newRows[index], precio_unitario: precio };
    setDetalleRows(newRows);
  };

  const addProductRow = () => {
    setDetalleRows([...detalleRows, { producto_id: 0, cantidad: 1, precio_unitario: 0 }]);
  };

  const removeProductRow = (index: number) => {
    if (detalleRows.length > 1) {
      setDetalleRows(detalleRows.filter((_, i) => i !== index));
    }
  };

  const totalCalculado = detalleRows.reduce(
    (sum, row) => sum + row.cantidad * row.precio_unitario,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id) {
      alert('Seleccione un cliente');
      return;
    }
    const detalleValido = detalleRows.filter((r) => r.producto_id > 0);
    if (detalleValido.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/ventas', {
        cliente_id: Number(formData.cliente_id),
        repartidor_id: formData.repartidor_id ? Number(formData.repartidor_id) : undefined,
        tipo_venta: formData.tipo_venta,
        tipo_pago: formData.tipo_pago,
        dias_plazo: formData.tipo_venta === 'credito' ? formData.dias_plazo : undefined,
        detalle: detalleValido.map((r) => ({
          producto_id: r.producto_id,
          cantidad: r.cantidad,
          precio_unitario: r.precio_unitario,
        })),
        observaciones: formData.observaciones || undefined,
      });
      switchToList();
      fetchVentas();
      fetchEstadisticas();
    } catch (error: any) {
      console.error('Error al crear venta:', error);
      alert(error.response?.data?.error || 'Error al crear la venta');
    } finally {
      setSubmitting(false);
    }
  };

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) =>
    `S/ ${value?.toFixed(2) ?? '0.00'}`;

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (mode === 'create') {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={switchToList}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nueva Venta</h1>
              <p className="text-sm text-gray-500">Registrar una nueva venta</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la Venta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repartidor (opcional)</label>
                <select
                  value={formData.repartidor_id}
                  onChange={(e) => setFormData({ ...formData, repartidor_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sin repartidor</option>
                  {repartidores.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Venta</label>
                <select
                  value={formData.tipo_venta}
                  onChange={(e) => setFormData({ ...formData, tipo_venta: e.target.value as 'contado' | 'credito' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago</label>
                <select
                  value={formData.tipo_pago}
                  onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value as 'efectivo' | 'yape' | 'transferencia' | 'plin' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="plin">Plin</option>
                </select>
              </div>

              {formData.tipo_venta === 'credito' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días de Plazo</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={formData.dias_plazo}
                    onChange={(e) => setFormData({ ...formData, dias_plazo: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
              <button
                type="button"
                onClick={addProductRow}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            </div>

            <div className="space-y-3">
              {detalleRows.map((row, index) => (
                <div key={index} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Producto</label>
                    <select
                      value={row.producto_id}
                      onChange={(e) => handleProductChange(index, Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={0}>Seleccione un producto</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} - {formatCurrency(p.precio_venta)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={row.cantidad}
                      onChange={(e) => handleCantidadChange(index, Math.max(1, Number(e.target.value)))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Precio Unit.</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={row.precio_unitario}
                      onChange={(e) => handlePrecioChange(index, Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subtotal</label>
                    <div className="px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg">
                      {formatCurrency(row.cantidad * row.precio_unitario)}
                    </div>
                  </div>

                  {detalleRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductRow(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCalculado)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Observaciones</h2>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Observaciones de la venta (opcional)"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={switchToList}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {submitting ? 'Guardando...' : 'Guardar Venta'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'reportes') {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setMode('list')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reportes de Ventas</h1>
            <p className="text-gray-600 mt-1">Visualiza las ventas por período</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
              <select value={reportePeriodo} onChange={(e) => setReportePeriodo(e.target.value as any)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="diario">Diario (por hora)</option>
                <option value="semanal">Semanal (por día)</option>
                <option value="mensual">Mensual (por día)</option>
                <option value="anual">Anual (por mes)</option>
              </select>
            </div>
            {reportePeriodo !== 'anual' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                <input type="date" value={reporteFecha} onChange={(e) => setReporteFecha(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
            {reportePeriodo === 'mensual' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
                <select value={reporteMes} onChange={(e) => setReporteMes(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][m - 1]}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
              <input type="number" value={reporteAnio} onChange={(e) => setReporteAnio(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24" />
            </div>
            <button onClick={fetchReporte} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Generar Reporte
            </button>
          </div>
        </div>

        {reporteLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : reporteData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-20 text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Sin datos para este período</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Total Transacciones</p>
                <p className="text-2xl font-bold text-gray-900">{reporteData.reduce((s: number, r: any) => s + Number(r.cantidad), 0)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Total Ingresos</p>
                <p className="text-2xl font-bold text-green-600">S/ {reporteData.reduce((s: number, r: any) => s + Number(r.total), 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Promedio por Transacción</p>
                <p className="text-2xl font-bold text-blue-600">S/ {(reporteData.reduce((s: number, r: any) => s + Number(r.total), 0) / Math.max(reporteData.reduce((s: number, r: any) => s + Number(r.cantidad), 0), 1)).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Días con Ventas</p>
                <p className="text-2xl font-bold text-purple-600">{reporteData.filter((r: any) => Number(r.cantidad) > 0).length}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {reportePeriodo === 'diario' ? 'Ventas por Hora' : reportePeriodo === 'semanal' ? 'Ventas por Día' : reportePeriodo === 'mensual' ? 'Ventas por Día del Mes' : 'Ventas por Mes'}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reporteData.map((r: any) => ({
                  ...r,
                  label: reportePeriodo === 'diario' ? `${r.hora}:00` : reportePeriodo === 'anual' ? ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][Number(r.mes)] : `Día ${r.dia}`
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                      {reportePeriodo === 'diario' ? 'Hora' : reportePeriodo === 'anual' ? 'Mes' : 'Día'}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reporteData.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {reportePeriodo === 'diario' ? `${r.hora}:00` : reportePeriodo === 'anual' ? ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][Number(r.mes)] : `Día ${r.dia}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{r.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">S/ {Number(r.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Tipo de Pago</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {reporteTipoPago.length === 0 ? (
                  <p className="text-sm text-gray-500 col-span-full">Sin datos para este período</p>
                ) : (
                  reporteTipoPago.map((r: any) => (
                    <div key={r.tipo_pago} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{r.tipo_pago}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">S/ {Number(r.total).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{r.cantidad} transacciones</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500">Gestión de ventas del sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('reportes'); fetchReporte(); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Reportes
          </button>
          <button
            onClick={switchToCreate}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {estadisticas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Ventas</p>
                <p className="text-lg font-bold text-gray-900">{estadisticas.total_ventas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Ingresos</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(estadisticas.total_ingresos)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Crédito</p>
                <p className="text-lg font-bold text-gray-900">{estadisticas.ventas_credito}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ticket Promedio</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(estadisticas.ticket_promedio)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre del cliente..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleFilter}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tipo Venta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tipo Pago</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Cargando ventas...
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    No se encontraron ventas
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">#{venta.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{venta.cliente_nombre || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(venta.fecha)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        venta.tipo_venta === 'credito' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {venta.tipo_venta === 'credito' ? (
                          <CreditCard className="w-3 h-3" />
                        ) : (
                          <DollarSign className="w-3 h-3" />
                        )}
                        {venta.tipo_venta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{venta.tipo_pago || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(venta.total)}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getEstadoClass(venta.estado)}`}>
                        {venta.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openDetail(venta)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Detalle
                        </button>
                        {esAdmin && (
                          <button
                            onClick={() => handleDelete(venta.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeDetail}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detalle de Venta #{selectedVenta.id}</h2>
                <p className="text-sm text-gray-500">Información completa de la venta</p>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="text-sm font-medium text-gray-900">{selectedVenta.cliente_nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Repartidor</p>
                  <p className="text-sm font-medium text-gray-900">{selectedVenta.repartidor_nombre || 'Sin repartidor'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fecha</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedVenta.fecha)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tipo de Venta</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{selectedVenta.tipo_venta}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tipo de Pago</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{selectedVenta.tipo_pago || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estado</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoClass(selectedVenta.estado)}`}>
                    {selectedVenta.estado}
                  </span>
                </div>
                {selectedVenta.observaciones && (
                  <div className="col-span-full">
                    <p className="text-xs text-gray-500">Observaciones</p>
                    <p className="text-sm text-gray-700">{selectedVenta.observaciones}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Productos</h3>
                {loadingDetalles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                          <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Precio Unit.</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {detalles.map((d) => (
                          <tr key={d.id}>
                            <td className="px-3 py-2 text-sm text-gray-900">{d.producto_nombre || `Producto #${d.producto_id}`}</td>
                            <td className="px-3 py-2 text-sm text-center text-gray-700">{d.cantidad}</td>
                            <td className="px-3 py-2 text-sm text-right text-gray-700">{formatCurrency(d.precio_unitario)}</td>
                            <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">{formatCurrency(d.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t border-gray-200">
                          <td colSpan={3} className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">Total</td>
                          <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">{formatCurrency(selectedVenta.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeDetail}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
