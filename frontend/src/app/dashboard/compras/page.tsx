'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/axios';
import { Compra, Producto, Proveedor } from '@/types';
import { Package, Plus, Eye, Truck, X, Minus, ShoppingCart, ArrowLeft, DollarSign, Calendar } from 'lucide-react';

type DetalleCompraForm = {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
};

type CompraFormData = {
  proveedor_id: number;
  tipo_pago: 'efectivo' | 'transferencia' | 'credito';
  observaciones: string;
  detalles: DetalleCompraForm[];
};

type DetalleCompra = {
  id: number;
  compra_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_nombre?: string;
};

type EstadisticasCompras = {
  total_compras: number;
  total_gastado: number;
};

type Filters = {
  fecha_desde: string;
  fecha_hasta: string;
  proveedor_id: string;
};

export default function ComprasPage() {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCompras>({ total_compras: 0, total_gastado: 0 });
  const [filters, setFilters] = useState<Filters>({ fecha_desde: '', fecha_hasta: '', proveedor_id: '' });
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [detalleCompra, setDetalleCompra] = useState<DetalleCompra[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm<CompraFormData>({
    defaultValues: {
      proveedor_id: 0,
      tipo_pago: 'efectivo',
      observaciones: '',
      detalles: [{ producto_id: 0, cantidad: 1, precio_unitario: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'detalles' });
  const detalles = watch('detalles');
  const totalCalculado = detalles?.reduce((sum, d) => sum + (d.cantidad || 0) * (d.precio_unitario || 0), 0) || 0;

  const fetchData = useCallback(async () => {
    try {
      const [comprasRes, statsRes, provRes, prodRes] = await Promise.all([
        api.get('/compras'),
        api.get('/compras/estadisticas'),
        api.get('/proveedores'),
        api.get('/productos'),
      ]);
      setCompras(comprasRes.data);
      setEstadisticas(statsRes.data);
      setProveedores(provRes.data);
      setProductos(prodRes.data);
    } catch {
      console.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name?.startsWith('detalles.') && name?.endsWith('.producto_id')) {
        const match = name.match(/detalles\.(\d+)\.producto_id/);
        if (match) {
          const index = parseInt(match[1]);
          const productoId = value.detalles?.[index]?.producto_id;
          if (productoId) {
            const producto = productos.find((p) => p.id === productoId);
            if (producto?.precio_compra) {
              setValue(`detalles.${index}.precio_unitario`, producto.precio_compra);
            }
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, productos, setValue]);

  const proveedorFilterId = filters.proveedor_id ? Number(filters.proveedor_id) : null;
  const filtered = compras.filter((c) => {
    if (filters.fecha_desde && c.fecha < filters.fecha_desde) return false;
    if (filters.fecha_hasta && c.fecha > filters.fecha_hasta) return false;
    if (proveedorFilterId && c.proveedor_id !== proveedorFilterId) return false;
    return true;
  });

  const openDetail = async (compra: Compra) => {
    setSelectedCompra(compra);
    setDetailLoading(true);
    try {
      const res = await api.get(`/compras/${compra.id}/detalles`);
      setDetalleCompra(res.data);
    } catch {
      console.error('Error al cargar detalles');
      setDetalleCompra([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const onSubmit = async (data: CompraFormData) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post('/compras', { ...data, detalle: data.detalles });
      setMode('list');
      reset();
      fetchData();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.error
        || data?.errors?.map((e: any) => e.msg).join('; ')
        || err?.message
        || 'Error al crear compra';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  const tipoPagoBadge = (tipo?: string) => {
    const styles: Record<string, string> = {
      efectivo: 'bg-green-100 text-green-800',
      transferencia: 'bg-blue-100 text-blue-800',
      credito: 'bg-orange-100 text-orange-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[tipo || ''] || 'bg-gray-100 text-gray-800'}`}>
        {tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '-'}
      </span>
    );
  };

  if (mode === 'create') {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { setMode('list'); reset(); }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nueva Compra</h1>
            <p className="text-gray-600 mt-1">Registrar una compra a proveedor</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                <select
                  {...register('proveedor_id', { required: true, validate: (v) => v > 0 })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value={0}>Seleccionar proveedor</option>
                  {proveedores.filter((p) => p.estado === 'activo').map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {errors.proveedor_id && <p className="mt-1 text-xs text-red-600">Selecciona un proveedor</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago *</label>
                <select
                  {...register('tipo_pago', { required: true })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
              <button
                type="button"
                onClick={() => append({ producto_id: 0, cantidad: 1, precio_unitario: 0 })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">P. Unitario</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
                    <th className="w-16 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fields.map((field, index) => {
                    const det = detalles?.[index];
                    const subtotal = (det?.cantidad || 0) * (det?.precio_unitario || 0);
                    return (
                      <tr key={field.id}>
                        <td className="px-4 py-2">
                          <select
                            {...register(`detalles.${index}.producto_id`, { required: true, validate: (v) => v > 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          >
                            <option value={0}>Seleccionar</option>
                            {productos.filter((p) => p.estado === 'activo').map((p) => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                          {errors.detalles?.[index]?.producto_id && <p className="mt-1 text-xs text-red-600">Selecciona un producto</p>}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            {...register(`detalles.${index}.cantidad`, { required: true, min: 1, valueAsNumber: true })}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
                          />
                          {errors.detalles?.[index]?.cantidad && <p className="mt-1 text-xs text-red-600">Cantidad mínima 1</p>}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            {...register(`detalles.${index}.precio_unitario`, { required: true, min: 0, valueAsNumber: true })}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                          />
                          {errors.detalles?.[index]?.precio_unitario && <p className="mt-1 text-xs text-red-600">Ingresa un precio válido</p>}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                          S/ {subtotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">S/ {totalCalculado.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Observaciones</h2>
            <textarea
              {...register('observaciones')}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Notas adicionales..."
            />
          </div>

          {submitError && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setMode('list'); reset(); }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              Registrar Compra
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Compras</h1>
          <p className="text-gray-600 mt-1">Gestión de compras a proveedores</p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Compra
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Compras</p>
            <p className="text-2xl font-bold text-gray-900">{estadisticas.total_compras}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Gastado</p>
            <p className="text-2xl font-bold text-gray-900">S/ {Number(estadisticas.total_gastado).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => setFilters((f) => ({ ...f, fecha_desde: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => setFilters((f) => ({ ...f, fecha_hasta: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="relative flex-1 max-w-xs">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={filters.proveedor_id}
                onChange={(e) => setFilters((f) => ({ ...f, proveedor_id: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none"
              >
                <option value="">Todos los proveedores</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <ShoppingCart className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No se encontraron compras</p>
            <p className="text-sm">Registra tu primera compra</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Proveedor</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo Pago</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">#{c.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{c.proveedor_nombre || 'Proveedor'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(c.fecha).toLocaleDateString('es-PE')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{tipoPagoBadge(c.tipo_pago)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right whitespace-nowrap">S/ {Number(c.total).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{estadoBadge(c.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openDetail(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {filtered.map((c) => (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{c.proveedor_nombre || 'Proveedor'}</p>
                      <p className="text-xs text-gray-500">#{c.id} - {new Date(c.fecha).toLocaleDateString('es-PE')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">S/ {Number(c.total).toFixed(2)}</p>
                      {tipoPagoBadge(c.tipo_pago)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {estadoBadge(c.estado)}
                    <button
                      onClick={() => openDetail(c)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
              {filtered.length} de {compras.length} compra(s)
            </div>
          </>
        )}
      </div>

      {selectedCompra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedCompra(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Compra #{selectedCompra.id}
              </h2>
              <button onClick={() => setSelectedCompra(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Proveedor</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCompra.proveedor_nombre || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(selectedCompra.fecha).toLocaleDateString('es-PE')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Pago</p>
                  <p className="mt-1">{tipoPagoBadge(selectedCompra.tipo_pago)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <p className="mt-1">{estadoBadge(selectedCompra.estado)}</p>
                </div>
              </div>

              {selectedCompra.observaciones && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Observaciones</p>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{selectedCompra.observaciones}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Detalles de la Compra</h3>
                {detailLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : detalleCompra.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Sin detalles</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                          <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">P. Unitario</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {detalleCompra.map((d) => (
                          <tr key={d.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{d.producto_nombre || `Producto #${d.producto_id}`}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-center">{d.cantidad}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right">S/ {Number(d.precio_unitario).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">S/ {Number(d.subtotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-300">
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Total</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">S/ {Number(selectedCompra.total).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
