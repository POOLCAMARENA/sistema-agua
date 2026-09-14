'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '@/lib/axios';
import { Programacion, Cliente, Producto, DetalleProgramacion } from '@/types';
import { useAuthStore } from '@/lib/store';
import { Plus, Search, X, CalendarClock, MapPin, Phone, ExternalLink, CheckCircle, Trash2, Eye, Clock, Package } from 'lucide-react';

type ProgramacionFormData = {
  cliente_id: number;
  fecha_programada: string;
  hora_programada: string;
  observaciones: string;
  ruta_id: number;
  detalle: { producto_id: number; cantidad: number; precio_unitario: number }[];
};

export default function ProgramacionesPage() {
  const { usuario } = useAuthStore();
  const [mode, setMode] = useState<'list' | 'create' | 'detail'>('list');
  const [programaciones, setProgramaciones] = useState<Programacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProgramacion, setSelectedProgramacion] = useState<Programacion | null>(null);
  const [detalles, setDetalles] = useState<DetalleProgramacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendiente');
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<ProgramacionFormData>({
    defaultValues: {
      detalle: [{ producto_id: 0, cantidad: 1, precio_unitario: 0 }]
    }
  });

  const { fields: detalleFields, append: appendDetalle, remove: removeDetalle } = useFieldArray({ control, name: 'detalle' });

  const selectedClienteId = watch('cliente_id');
  const detalleValues = watch('detalle');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (selectedClienteId) {
      const cliente = clientes.find(c => c.id === Number(selectedClienteId));
      if (cliente && cliente.ruta_id) {
        setValue('ruta_id', cliente.ruta_id);
      }
    }
  }, [selectedClienteId, clientes, setValue]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [progRes, clientesRes, productosRes] = await Promise.all([
        api.get('/programaciones'),
        api.get('/clientes'),
        api.get('/productos')
      ]);
      setProgramaciones(progRes.data);
      setClientes(clientesRes.data.filter((c: Cliente) => c.estado === 'activo'));
      setProductos(productosRes.data.filter((p: Producto) => p.estado === 'activo'));
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarProgramaciones = async () => {
    try {
      const params: any = {};
      if (filtro !== 'todas') params.estado = filtro;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const res = await api.get('/programaciones', { params });
      setProgramaciones(res.data);
    } catch (error) {
      console.error('Error al cargar programaciones:', error);
    }
  };

  useEffect(() => {
    cargarProgramaciones();
  }, [filtro, fechaDesde, fechaHasta]);

  const onSubmit = async (data: ProgramacionFormData) => {
    try {
      const payload: any = {
        cliente_id: Number(data.cliente_id),
        ruta_id: data.ruta_id || null,
        fecha_programada: data.fecha_programada,
        hora_programada: data.hora_programada,
        observaciones: data.observaciones,
        detalle: data.detalle.filter(d => d.producto_id > 0).map(d => ({
          producto_id: Number(d.producto_id),
          cantidad: Number(d.cantidad),
          precio_unitario: Number(d.precio_unitario)
        }))
      };
      await api.post('/programaciones', payload);
      reset();
      setMode('list');
      cargarProgramaciones();
    } catch (error: any) {
      alert(error?.response?.data?.error || error?.response?.data?.errors?.[0]?.msg || 'Error al crear programación');
    }
  };

  const verDetalle = async (prog: Programacion) => {
    try {
      setSelectedProgramacion(prog);
      const res = await api.get(`/programaciones/${prog.id}/detalles`);
      setDetalles(res.data);
      setMode('detail');
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    }
  };

  const cambiarEstado = async (id: number, estado: string) => {
    const msg = estado === 'completada' ? '¿Marcar como completada?' : '¿Cancelar esta programación?';
    if (!confirm(msg)) return;
    try {
      await api.patch(`/programaciones/${id}/estado`, { estado });
      cargarProgramaciones();
      if (selectedProgramacion?.id === id) {
        setSelectedProgramacion({ ...selectedProgramacion!, estado: estado as any });
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al actualizar estado');
    }
  };

  const eliminarProgramacion = async (id: number) => {
    if (!confirm('¿Eliminar esta programación?')) return;
    try {
      await api.delete(`/programaciones/${id}`);
      setMode('list');
      cargarProgramaciones();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al eliminar programación');
    }
  };

  const clienteSeleccionado = clientes.find(c => c.id === Number(selectedClienteId));

  const programacionesFiltradas = programaciones.filter(p =>
    p.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.ruta_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const hoy = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ─── CREATE MODE ───
  if (mode === 'create') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Nueva Programación</h1>
          <button onClick={() => { setMode('list'); reset(); }} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Cliente */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Datos del Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  {...register('cliente_id', { required: 'El cliente es requerido' })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value={0}>Seleccionar cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} - {c.telefono}</option>
                  ))}
                </select>
                {errors.cliente_id && <p className="text-red-500 text-xs mt-1">{errors.cliente_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruta (automática)</label>
                <input
                  type="text"
                  value={clienteSeleccionado?.ruta_nombre || 'Sin ruta asignada'}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
                <input type="hidden" {...register('ruta_id')} />
              </div>
            </div>

            {clienteSeleccionado && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <p className="flex items-center gap-2 text-gray-700"><MapPin className="w-4 h-4" /> {clienteSeleccionado.direccion}</p>
                {clienteSeleccionado.referencia && <p className="text-gray-500 mt-1">Ref: {clienteSeleccionado.referencia}</p>}
                {clienteSeleccionado.ubicacion && (
                  <a href={clienteSeleccionado.ubicacion} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" /> Ver en mapa
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-600" /> Fecha y Hora de Visita
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  {...register('fecha_programada', { required: 'La fecha es requerida' })}
                  min={hoy}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.fecha_programada && <p className="text-red-500 text-xs mt-1">{errors.fecha_programada.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                <input
                  type="time"
                  {...register('hora_programada', { required: 'La hora es requerida' })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.hora_programada && <p className="text-red-500 text-xs mt-1">{errors.hora_programada.message}</p>}
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" /> Productos
              </h2>
              <button type="button" onClick={() => appendDetalle({ producto_id: 0, cantidad: 1, precio_unitario: 0 })}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
            <div className="space-y-3">
              {detalleFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <select
                    {...register(`detalle.${index}.producto_id`, { valueAsNumber: true })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value={0}>Seleccionar producto</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} - S/. {p.precio_venta}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    {...register(`detalle.${index}.cantidad`, { valueAsNumber: true, min: 1 })}
                    placeholder="Cant."
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    {...register(`detalle.${index}.precio_unitario`, { valueAsNumber: true })}
                    placeholder="Precio"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-sm text-gray-500 w-20 text-right">
                    S/. {((detalleValues?.[index]?.cantidad || 0) * (detalleValues?.[index]?.precio_unitario || 0)).toFixed(2)}
                  </span>
                  {detalleFields.length > 1 && (
                    <button type="button" onClick={() => removeDetalle(index)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <span className="text-lg font-semibold">
                Total: S/. {detalleValues?.reduce((sum, d) => sum + ((d?.cantidad || 0) * (d?.precio_unitario || 0)), 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              {...register('observaciones')}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Notas sobre la visita programada..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setMode('list'); reset(); }}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Programar Visita
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── DETAIL MODE ───
  if (mode === 'detail' && selectedProgramacion) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Programación #{selectedProgramacion.id}</h1>
          <button onClick={() => setMode('list')} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selectedProgramacion.cliente_nombre}</h2>
              <p className="text-gray-500 flex items-center gap-1 mt-1"><Phone className="w-4 h-4" /> {selectedProgramacion.cliente_telefono}</p>
              <p className="text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" /> {selectedProgramacion.cliente_direccion}</p>
              {selectedProgramacion.cliente_ubicacion && (
                <a href={selectedProgramacion.cliente_ubicacion} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 mt-1 text-sm">
                  <ExternalLink className="w-3 h-3" /> Ver en mapa
                </a>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedProgramacion.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
              selectedProgramacion.estado === 'completada' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {selectedProgramacion.estado.charAt(0).toUpperCase() + selectedProgramacion.estado.slice(1)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Fecha Programada</p>
              <p className="font-medium flex items-center gap-1"><CalendarClock className="w-4 h-4" /> {new Date(selectedProgramacion.fecha_programada + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hora</p>
              <p className="font-medium flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedProgramacion.hora_programada?.substring(0, 5)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ruta</p>
              <p className="font-medium">{selectedProgramacion.ruta_nombre || 'Sin ruta'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Estimado</p>
              <p className="font-medium">S/. {(selectedProgramacion.total || 0).toFixed(2)}</p>
            </div>
          </div>
          {selectedProgramacion.observaciones && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Observaciones</p>
              <p className="text-sm">{selectedProgramacion.observaciones}</p>
            </div>
          )}
        </div>

        {detalles.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <h3 className="font-semibold mb-3">Productos Programados</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Cant.</th>
                    <th className="text-right py-2">Precio</th>
                    <th className="text-right py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map(d => (
                    <tr key={d.id} className="border-b">
                      <td className="py-2">{d.producto_nombre}</td>
                      <td className="text-right py-2">{d.cantidad}</td>
                      <td className="text-right py-2">S/. {d.precio_unitario}</td>
                      <td className="text-right py-2">S/. {d.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          {selectedProgramacion.estado === 'pendiente' && (
            <>
              <button onClick={() => cambiarEstado(selectedProgramacion.id, 'completada')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <CheckCircle className="w-4 h-4" /> Completar
              </button>
              <button onClick={() => cambiarEstado(selectedProgramacion.id, 'cancelada')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                <X className="w-4 h-4" /> Cancelar
              </button>
            </>
          )}
          {usuario?.rol === 'admin' && (
            <button onClick={() => eliminarProgramacion(selectedProgramacion.id)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── LIST MODE ───
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Programar Ventas</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona las visitas programadas a clientes</p>
        </div>
        <button onClick={() => setMode('create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-5 h-5" /> Nueva Programación
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {['pendiente', 'completada', 'cancelada', 'todas'].map(estado => (
              <button key={estado} onClick={() => setFiltro(estado)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtro === estado ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {estado.charAt(0).toUpperCase() + estado.slice(1)}
              </button>
            ))}
          </div>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Desde" />
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Hasta" />
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente o ruta..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      {programacionesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CalendarClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay programaciones {filtro !== 'todas' ? `con estado "${filtro}"` : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ruta</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hora</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {programacionesFiltradas.map(prog => (
                  <tr key={prog.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{prog.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{prog.cliente_nombre}</p>
                        <p className="text-gray-400 text-xs">{prog.cliente_telefono}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{prog.ruta_nombre || '-'}</td>
                    <td className="px-4 py-3">{new Date(prog.fecha_programada + 'T00:00:00').toLocaleDateString('es-PE')}</td>
                    <td className="px-4 py-3">{prog.hora_programada?.substring(0, 5)}</td>
                    <td className="px-4 py-3 text-right">S/. {(prog.total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        prog.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        prog.estado === 'completada' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {prog.estado.charAt(0).toUpperCase() + prog.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => verDetalle(prog)} className="text-blue-600 hover:text-blue-800" title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </button>
                        {prog.estado === 'pendiente' && (
                          <button onClick={() => cambiarEstado(prog.id, 'completada')} className="text-green-600 hover:text-green-800" title="Completar">
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

          {/* Mobile */}
          <div className="md:hidden divide-y">
            {programacionesFiltradas.map(prog => (
              <div key={prog.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{prog.cliente_nombre}</p>
                    <p className="text-gray-400 text-xs">{prog.cliente_telefono}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    prog.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    prog.estado === 'completada' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {prog.estado.charAt(0).toUpperCase() + prog.estado.slice(1)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {new Date(prog.fecha_programada + 'T00:00:00').toLocaleDateString('es-PE')} a las {prog.hora_programada?.substring(0, 5)}</p>
                  <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {prog.ruta_nombre || 'Sin ruta'}</p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-semibold">S/. {(prog.total || 0).toFixed(2)}</span>
                  <button onClick={() => verDetalle(prog)} className="text-blue-600 text-sm font-medium">Ver detalle</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
