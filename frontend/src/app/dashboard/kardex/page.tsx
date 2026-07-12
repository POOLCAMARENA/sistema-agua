'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { FileText, Search, Calendar, ArrowUpDown, Filter, BarChart3, List, Package, ArrowDown, ArrowUp } from 'lucide-react';

interface KardexMovimiento {
  id: number;
  producto_id: number;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  fecha: string;
  referencia?: string;
  documento_id?: number;
  documento_tipo?: string;
  observaciones?: string;
  producto_nombre?: string;
}

interface KardexReporte {
  producto: string;
  categoria: string;
  total_entradas: number;
  total_salidas: number;
  total_ajustes: number;
  stock_final: number;
}

interface ProductoOption {
  id: number;
  nombre: string;
}

interface EstadisticasStock {
  total_stock: number;
  total_productos: number;
}

interface ReporteData {
  total_entradas: number;
  total_salidas: number;
  movimientos: number;
}

type ViewMode = 'movimientos' | 'reporte';

const tipoBadge = (tipo: string) => {
  const styles: Record<string, string> = {
    entrada: 'bg-green-100 text-green-800',
    salida: 'bg-red-100 text-red-800',
    ajuste: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[tipo] || 'bg-gray-100 text-gray-800'}`}>
      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
    </span>
  );
};

export default function KardexPage() {
  const [movimientos, setMovimientos] = useState<KardexMovimiento[]>([]);
  const [reportes, setReportes] = useState<KardexReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [reporteLoading, setReporteLoading] = useState(false);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasStock>({ total_stock: 0, total_productos: 0 });
  const [reporteData, setReporteData] = useState<ReporteData>({ total_entradas: 0, total_salidas: 0, movimientos: 0 });

  const [viewMode, setViewMode] = useState<ViewMode>('movimientos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [productoId, setProductoId] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('');

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (productoId) params.producto_id = productoId;
      if (tipoMovimiento) params.tipo_movimiento = tipoMovimiento;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      const { data } = await api.get('/kardex', { params });
      setMovimientos(data);
    } catch {
      console.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const fetchReporte = async () => {
    setReporteLoading(true);
    try {
      const params: Record<string, string> = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      const { data } = await api.get('/kardex/reporte', { params });
      setReportes(data);
    } catch {
      console.error('Error al cargar reporte');
    } finally {
      setReporteLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [movRes, prodRes, statsRes, reporteRes] = await Promise.all([
        api.get('/kardex'),
        api.get('/productos'),
        api.get('/productos/estadisticas'),
        api.get('/kardex/reporte'),
      ]);
      setMovimientos(movRes.data);
      setProductos(prodRes.data);
      setEstadisticas(statsRes.data);
      setReporteData(reporteRes.data);
      setReportes(reporteRes.data);
    } catch {
      console.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (viewMode === 'movimientos') {
      fetchMovimientos();
    } else {
      fetchReporte();
    }
  }, [fechaInicio, fechaFin, productoId, tipoMovimiento, viewMode]);

  const handleSearch = () => {
    if (viewMode === 'movimientos') {
      fetchMovimientos();
    } else {
      fetchReporte();
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Kardex / Inventario</h1>
          <p className="text-gray-600 mt-1">Movimientos y reportes de inventario</p>
        </div>
        <button
          onClick={() => setViewMode(viewMode === 'movimientos' ? 'reporte' : 'movimientos')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          {viewMode === 'movimientos' ? <BarChart3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
          {viewMode === 'movimientos' ? 'Ver Reporte' : 'Ver Movimientos'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <ArrowDown className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Entradas</p>
            <p className="text-2xl font-bold text-green-600">{reporteData.total_entradas}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg">
            <ArrowUp className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Salidas</p>
            <p className="text-2xl font-bold text-red-600">{reporteData.total_salidas}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Stock Total</p>
            <p className="text-2xl font-bold text-gray-900">{estadisticas.total_stock}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none"
              >
                <option value="">Todos los productos</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="relative min-w-[160px] max-w-xs">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none"
              >
                <option value="">Todos los tipos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>

        {viewMode === 'movimientos' ? (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : movimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <FileText className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-lg font-medium">No se encontraron movimientos</p>
                <p className="text-sm">Ajusta los filtros o registra un movimiento</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Anterior</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Nuevo</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Referencia</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {movimientos.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(m.fecha).toLocaleDateString('es-PE')}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {m.producto_nombre || `Producto #${m.producto_id}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{tipoBadge(m.tipo_movimiento)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium whitespace-nowrap">
                            {m.cantidad}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 text-right whitespace-nowrap">{m.stock_anterior}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium whitespace-nowrap">{m.stock_nuevo}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{m.referencia || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">{m.observaciones || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {movimientos.map((m) => (
                    <div key={m.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{m.producto_nombre || `Producto #${m.producto_id}`}</p>
                          <p className="text-xs text-gray-500">{new Date(m.fecha).toLocaleDateString('es-PE')}</p>
                        </div>
                        <div className="text-right">{tipoBadge(m.tipo_movimiento)}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Cantidad</p>
                          <p className="font-medium">{m.cantidad}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Stock Anterior</p>
                          <p className="font-medium">{m.stock_anterior}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Stock Nuevo</p>
                          <p className="font-medium">{m.stock_nuevo}</p>
                        </div>
                      </div>
                      {(m.referencia || m.observaciones) && (
                        <p className="text-xs text-gray-500">
                          {m.referencia && <span>Ref: {m.referencia}</span>}
                          {m.referencia && m.observaciones && <span> - </span>}
                          {m.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
                  {movimientos.length} movimiento(s)
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {reporteLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : reportes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <BarChart3 className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-lg font-medium">No hay datos de reporte</p>
                <p className="text-sm">Ajusta los filtros de fecha</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Entradas</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Salidas</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Ajustes</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportes.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.producto}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{r.categoria}</td>
                          <td className="px-6 py-4 text-sm text-green-600 font-medium text-right">{r.total_entradas}</td>
                          <td className="px-6 py-4 text-sm text-red-600 font-medium text-right">{r.total_salidas}</td>
                          <td className="px-6 py-4 text-sm text-orange-600 font-medium text-right">{r.total_ajustes}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-bold text-right">{r.stock_final}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-200">
                  {reportes.map((r, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{r.producto}</p>
                          <p className="text-xs text-gray-500">{r.categoria}</p>
                        </div>
                        <p className="font-bold text-gray-900">Stock: {r.stock_final}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-green-600 text-xs font-medium">Entradas</p>
                          <p className="font-medium text-green-600">{r.total_entradas}</p>
                        </div>
                        <div>
                          <p className="text-red-600 text-xs font-medium">Salidas</p>
                          <p className="font-medium text-red-600">{r.total_salidas}</p>
                        </div>
                        <div>
                          <p className="text-orange-600 text-xs font-medium">Ajustes</p>
                          <p className="font-medium text-orange-600">{r.total_ajustes}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
                  {reportes.length} producto(s)
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
