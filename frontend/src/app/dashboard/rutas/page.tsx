'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/lib/store';
import { Map, Plus, Edit, Eye, Users, X, Trash2 } from 'lucide-react';

interface Ruta {
  id: number;
  nombre: string;
  descripcion?: string;
  repartidor_id?: number;
  estado: string;
  repartidor_nombre?: string;
  fecha_creacion: string;
}

interface RutaCliente {
  id: number;
  ruta_id: number;
  cliente_id: number;
  orden_visita: number;
  nombre?: string;
  telefono?: string;
  direccion?: string;
}

interface Repartidor {
  id: number;
  nombre: string;
}

interface Cliente {
  id: number;
  nombre: string;
}

const initialRutaForm = { nombre: '', descripcion: '', repartidor_id: 0 };

type ModalType = 'create' | 'edit' | 'viewClients' | 'assignClient' | null;

export default function RutasPage() {
  const esAdmin = useAuthStore((s) => s.usuario)?.rol === 'admin';
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [form, setForm] = useState(initialRutaForm);
  const [rutaClientes, setRutaClientes] = useState<RutaCliente[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assignClienteId, setAssignClienteId] = useState(0);
  const [assignOrden, setAssignOrden] = useState(1);

  const fetchRutas = useCallback(async () => {
    try {
      const res = await api.get('/rutas');
      setRutas(res.data);
    } catch {
      console.error('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRepartidores = useCallback(async () => {
    try {
      const res = await api.get('/repartidores');
      setRepartidores(res.data);
    } catch {
      console.error('Error al cargar repartidores');
    }
  }, []);

  const fetchClientes = useCallback(async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch {
      console.error('Error al cargar clientes');
    }
  }, []);

  useEffect(() => {
    fetchRutas();
    fetchRepartidores();
    fetchClientes();
  }, [fetchRutas, fetchRepartidores, fetchClientes]);

  const fetchRutaClientes = async (rutaId: number) => {
    try {
      const res = await api.get(`/rutas/${rutaId}/clientes`);
      setRutaClientes(res.data);
    } catch {
      console.error('Error al cargar clientes de la ruta');
    }
  };

  const openCreate = () => {
    setSelectedRuta(null);
    setForm(initialRutaForm);
    setError('');
    setModal('create');
  };

  const openEdit = (ruta: Ruta) => {
    setSelectedRuta(ruta);
    setForm({
      nombre: ruta.nombre,
      descripcion: ruta.descripcion || '',
      repartidor_id: ruta.repartidor_id || 0,
    });
    setError('');
    setModal('edit');
  };

  const openViewClients = async (ruta: Ruta) => {
    setSelectedRuta(ruta);
    await fetchRutaClientes(ruta.id);
    setModal('viewClients');
  };

  const openAssignClient = (ruta: Ruta) => {
    setSelectedRuta(ruta);
    setAssignClienteId(0);
    setAssignOrden(1);
    setError('');
    setModal('assignClient');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.name === 'repartidor_id' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload: Record<string, any> = {
      ...form,
      repartidor_id: form.repartidor_id || null,
    };

    if (selectedRuta) {
      payload.estado = selectedRuta.estado;
    }

    try {
      if (selectedRuta) {
        await api.put(`/rutas/${selectedRuta.id}`, payload);
      } else {
        await api.post('/rutas', payload);
      }
      setModal(null);
      fetchRutas();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar ruta');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuta || !assignClienteId) return;
    setSaving(true);
    setError('');

    try {
      await api.post(`/rutas/${selectedRuta.id}/clientes`, {
        cliente_id: assignClienteId,
        orden_visita: assignOrden,
      });
      setModal(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClient = async (clienteId: number) => {
    if (!selectedRuta || !confirm('¿Eliminar este cliente de la ruta?')) return;
    try {
      await api.delete(`/rutas/${selectedRuta.id}/clientes/${clienteId}`);
      fetchRutaClientes(selectedRuta.id);
    } catch {
      console.error('Error al eliminar cliente de la ruta');
    }
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      activo: 'bg-green-100 text-green-800',
      inactivo: 'bg-gray-100 text-gray-800',
      pendiente: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Rutas</h1>
          <p className="text-gray-600 mt-1">Gestión de rutas de reparto</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Ruta
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Repartidor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rutas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    <Map className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>No hay rutas registradas</p>
                    <button onClick={openCreate} className="text-blue-600 hover:text-blue-800 font-medium mt-2 text-sm">
                      Crear la primera ruta
                    </button>
                  </td>
                </tr>
              ) : (
                rutas.map((ruta) => (
                  <tr key={ruta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Map className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-sm">{ruta.nombre}</span>
                          {ruta.descripcion && (
                            <p className="text-xs text-gray-500 mt-0.5">{ruta.descripcion}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">
                      {ruta.repartidor_nombre || '—'}
                    </td>
                    <td className="px-4 py-3">{getEstadoBadge(ruta.estado)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(ruta)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openViewClients(ruta)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver Clientes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openAssignClient(ruta)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Asignar Cliente"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Map className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {modal === 'edit' ? 'Editar Ruta' : 'Nueva Ruta'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {modal === 'edit' ? 'Modifica los datos de la ruta' : 'Ingresa los datos de la nueva ruta'}
                  </p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="m-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nombre de la ruta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Descripción opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repartidor Asignado</label>
                <select
                  name="repartidor_id"
                  value={form.repartidor_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value={0}>Sin asignar</option>
                  {repartidores.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>
              {modal === 'edit' && selectedRuta && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    name="estado"
                    value={selectedRuta.estado}
                    onChange={(e) => setSelectedRuta({ ...selectedRuta, estado: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {saving ? 'Guardando...' : modal === 'edit' ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Clients Modal */}
      {modal === 'viewClients' && selectedRuta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <Eye className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Clientes de: {selectedRuta.nombre}</h2>
                  <p className="text-sm text-gray-500">Lista de clientes asignados a esta ruta</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {rutaClientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Users className="w-10 h-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No hay clientes asignados</p>
                  <button
                    onClick={() => { setModal('assignClient'); }}
                    className="text-blue-600 hover:text-blue-800 text-sm mt-2 font-medium"
                  >
                    Asignar cliente
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Orden</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Dirección</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rutaClientes.map((rc) => (
                        <tr key={rc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-700">{rc.orden_visita}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{rc.nombre || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">{rc.telefono || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell max-w-[200px] truncate">{rc.direccion || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {esAdmin && (
                              <button
                                onClick={() => handleRemoveClient(rc.cliente_id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar de la ruta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => { setModal('assignClient'); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                Asignar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Client Modal */}
      {modal === 'assignClient' && selectedRuta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Asignar Cliente</h2>
                  <p className="text-sm text-gray-500">Ruta: {selectedRuta.nombre}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="m-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleAssignClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={assignClienteId}
                  onChange={(e) => setAssignClienteId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value={0}>Seleccionar cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Visita</label>
                <input
                  type="number"
                  value={assignOrden}
                  onChange={(e) => setAssignOrden(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !assignClienteId}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {saving ? 'Asignando...' : 'Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
