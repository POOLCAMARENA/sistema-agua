'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/axios';
import { Pedido, Cliente, Producto, DetallePedido } from '@/types';
import { Plus, Eye, X, Minus, ShoppingCart, MapPin, ExternalLink, ClipboardList, CheckCircle, ArrowLeft } from 'lucide-react';

type DetallePedidoForm = {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
};

type PedidoFormData = {
  cliente_id: number;
  observaciones: string;
  detalles: DetallePedidoForm[];
};

type PedidoExtendido = Pedido & {
  cliente_ubicacion?: string;
  cliente_referencia?: string;
};

export default function PedidosPage() {
  const [mode, setMode] = useState<'list' | 'create' | 'detail'>('list');
  const [pedidos, setPedidos] = useState<PedidoExtendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<PedidoExtendido | null>(null);
  const [detallePedido, setDetallePedido] = useState<DetallePedido[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [filterEstado, setFilterEstado] = useState('');

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm<PedidoFormData>({
    defaultValues: {
      cliente_id: 0,
      observaciones: '',
      detalles: [{ producto_id: 0, cantidad: 1, precio_unitario: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'detalles' });
  const detalles = watch('detalles');
  const totalCalculado = detalles?.reduce((sum, d) => sum + (d.cantidad || 0) * (d.precio_unitario || 0), 0) || 0;

  const fetchData = useCallback(async () => {
    try {
      const params = filterEstado ? `?estado=${filterEstado}` : '';
      const [pedidosRes, clientesRes, prodRes] = await Promise.all([
        api.get(`/pedidos${params}`),
        api.get('/clientes?estado=activo'),
        api.get('/productos?estado=activo'),
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data);
      setProductos(prodRes.data);
      const pendientes = pedidosRes.data.filter((p: Pedido) => p.estado === 'pendiente').length;
      setPendientesCount(pendientes);
    } catch {
      console.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [filterEstado]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    reset({ cliente_id: 0, observaciones: '', detalles: [{ producto_id: 0, cantidad: 1, precio_unitario: 0 }] });
    setMode('create');
  };

  const openDetail = async (pedido: PedidoExtendido) => {
    setSelectedPedido(pedido);
    setMode('detail');
    setDetailLoading(true);
    try {
      const res = await api.get(`/pedidos/${pedido.id}/detalles`);
      setDetallePedido(res.data);
    } catch {
      console.error('Error al cargar detalles');
    } finally {
      setDetailLoading(false);
    }
  };

  const onSubmit = async (data: PedidoFormData) => {
    setSubmitting(true);
    try {
      await api.post('/pedidos', { ...data, detalle: data.detalles });
      setMode('list');
      reset();
      fetchData();
    } catch {
      console.error('Error al crear pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntrega = async (id: number) => {
    if (!confirm('¿Confirmar entrega de este pedido?')) return;
    try {
      await api.patch(`/pedidos/${id}/estado`, { estado: 'entregado' });
      fetchData();
      if (selectedPedido?.id === id) {
        setSelectedPedido((prev) => prev ? { ...prev, estado: 'entregado' as const } : null);
      }
    } catch {
      console.error('Error al actualizar pedido');
    }
  };

  const handleCancelar = async (id: number) => {
    if (!confirm('¿Cancelar este pedido?')) return;
    try {
      await api.patch(`/pedidos/${id}/estado`, { estado: 'cancelado' });
      fetchData();
      if (selectedPedido?.id === id) {
        setSelectedPedido((prev) => prev ? { ...prev, estado: 'cancelado' as const } : null);
      }
    } catch {
      console.error('Error al cancelar pedido');
    }
  };

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      entregado: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
        {estado === 'pendiente' ? 'Pendiente' : estado === 'entregado' ? 'Entregado' : 'Cancelado'}
      </span>
    );
  };

  const formatFecha = (f: string) => {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (mode === 'create') {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { setMode('list'); reset(); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nuevo Pedido</h1>
            <p className="text-gray-600 mt-1">Registrar un pedido de cliente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
            <select
              {...register('cliente_id', { required: true, validate: (v) => v > 0 })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value={0}>Seleccionar cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} - {c.telefono}</option>
              ))}
            </select>
            {errors.cliente_id && <p className="mt-1 text-xs text-red-600">Selecciona un cliente</p>}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">P. Unitario</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                            <option value={0}>Seleccionar</option>
                            {productos.map((p) => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                          {errors.detalles?.[index]?.producto_id && <p className="mt-1 text-xs text-red-600">Selecciona un producto</p>}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="1" step="1"
                            {...register(`detalles.${index}.cantidad`, { required: true, min: 1, valueAsNumber: true })}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          {errors.detalles?.[index]?.cantidad && <p className="mt-1 text-xs text-red-600">Cantidad mínima 1</p>}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number" min="0" step="0.01"
                            {...register(`detalles.${index}.precio_unitario`, { required: true, min: 0, valueAsNumber: true })}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          {errors.detalles?.[index]?.precio_unitario && <p className="mt-1 text-xs text-red-600">Ingresa un precio</p>}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium">S/ {subtotal.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
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
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Notas del pedido..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setMode('list'); reset(); }} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              Registrar Pedido
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'detail' && selectedPedido) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { setMode('list'); setSelectedPedido(null); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pedido #{selectedPedido.id}</h1>
            <p className="text-gray-600 mt-1">{formatFecha(selectedPedido.fecha_creacion)}</p>
          </div>
          {estadoBadge(selectedPedido.estado)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Cliente</h2>
            <div className="space-y-3">
              <p className="font-medium text-gray-900">{selectedPedido.cliente_nombre}</p>
              <div className="flex flex-wrap gap-2">
                <a href={`https://wa.me/${(selectedPedido.cliente_telefono || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> {selectedPedido.cliente_telefono || 'Sin teléfono'}
                </a>
                {selectedPedido.cliente_ubicacion && (
                  <a href={selectedPedido.cliente_ubicacion} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100">
                    <MapPin className="w-4 h-4" /> Ver ubicación <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-gray-600"><span className="font-medium">Dirección:</span> {selectedPedido.cliente_direccion || '-'}</p>
              {selectedPedido.cliente_referencia && <p className="text-sm text-gray-600"><span className="font-medium">Referencia:</span> {selectedPedido.cliente_referencia}</p>}
              {selectedPedido.observaciones && <p className="text-sm text-gray-600"><span className="font-medium">Observaciones:</span> {selectedPedido.observaciones}</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
            <div className="space-y-3">
              {selectedPedido.estado === 'pendiente' && (
                <>
                  <button onClick={() => handleEntrega(selectedPedido.id)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Marcar Entregado
                  </button>
                  <button onClick={() => handleCancelar(selectedPedido.id)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                    <X className="w-4 h-4" /> Cancelar Pedido
                  </button>
                </>
              )}
              {selectedPedido.estado === 'entregado' && selectedPedido.fecha_entrega && (
                <p className="text-sm text-gray-600 text-center">Entregado el {formatFecha(selectedPedido.fecha_entrega)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos del Pedido</h2>
          {detailLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">P. Unitario</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detallePedido.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.producto_nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{d.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">S/ {d.precio_unitario.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">S/ {d.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-sm text-right text-gray-700">Total</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">S/ {selectedPedido.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600 mt-1">Gestión de pedidos de clientes</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm">
          <Plus className="w-4 h-4" />
          Nuevo Pedido
        </button>
      </div>

      {pendientesCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Tienes <strong>{pendientesCount}</strong> pedido(s) pendiente(s) de entrega
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex gap-2 flex-wrap">
          {['', 'pendiente', 'entregado', 'cancelado'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterEstado(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterEstado === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === '' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : f === 'entregado' ? 'Entregados' : 'Cancelados'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <ShoppingCart className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No hay pedidos</p>
            <p className="text-sm">Crea tu primer pedido</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Teléfono</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ubicación</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{p.cliente_nombre || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {p.cliente_telefono ? (
                          <a href={`https://wa.me/${p.cliente_telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800">
                            {p.cliente_telefono}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {p.cliente_ubicacion ? (
                          <a href={p.cliente_ubicacion} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                          </a>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatFecha(p.fecha_creacion)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">S/ {p.total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">{estadoBadge(p.estado)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openDetail(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver detalle">
                            <Eye className="w-4 h-4" />
                          </button>
                          {p.estado === 'pendiente' && (
                            <button onClick={() => handleEntrega(p.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Marcar entregado">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {pedidos.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">#{p.id} - {p.cliente_nombre}</p>
                      <p className="text-sm text-gray-500">{formatFecha(p.fecha_creacion)}</p>
                    </div>
                    {estadoBadge(p.estado)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {p.cliente_telefono && (
                      <a href={`https://wa.me/${p.cliente_telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600">WhatsApp</a>
 )}
                    {p.cliente_ubicacion && (
                      <a href={p.cliente_ubicacion} target="_blank" rel="noopener noreferrer" className="text-blue-600">Maps</a>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">S/ {p.total.toFixed(2)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openDetail(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                      {p.estado === 'pendiente' && (
                        <button onClick={() => handleEntrega(p.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
