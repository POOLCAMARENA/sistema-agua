'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { Cliente } from '@/types';
import { useAuthStore } from '@/lib/store';
import { Plus, Edit, Trash2, Search, Users, X, MapPin, ExternalLink, Camera, Navigation } from 'lucide-react';

type ClienteFormData = {
  nombre: string;
  dni_ruc: string;
  telefono: string;
  direccion: string;
  referencia: string;
  ubicacion: string;
  foto: string;
  latitud: number;
  longitud: number;
  tipo_cliente: 'regular' | 'vip' | 'empresarial';
};

export default function ClientesPage() {
  const esAdmin = useAuthStore((s) => s.usuario)?.rol === 'admin';
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fotoPreview, setFotoPreview] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fotoModal, setFotoModal] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClienteFormData>();

  const fetchClientes = useCallback(async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch {
      console.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const openCreate = () => {
    setEditingId(null);
    reset({ nombre: '', dni_ruc: '', telefono: '', direccion: '', referencia: '', ubicacion: '', foto: '', latitud: 0, longitud: 0, tipo_cliente: 'regular' });
    setFotoPreview('');
    setModalOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditingId(c.id);
    setValue('nombre', c.nombre);
    setValue('dni_ruc', c.dni_ruc || '');
    setValue('telefono', c.telefono);
    setValue('direccion', c.direccion);
    setValue('referencia', c.referencia || '');
    setValue('ubicacion', c.ubicacion || '');
    setValue('foto', c.foto || '');
    setValue('latitud', c.latitud || 0);
    setValue('longitud', c.longitud || 0);
    setFotoPreview(c.foto || '');
    setValue('tipo_cliente', c.tipo_cliente);
    setModalOpen(true);
  };

  const capturarFoto = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('foto', file);
      try {
        const res = await api.post('/upload/foto', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const url = res.data.url;
        setValue('foto', url);
        setFotoPreview(url);
      } catch (err: any) {
        alert(err?.response?.data?.error || 'Error al subir foto');
      }
    };
    input.click();
  };

  const capturarGPS = () => {
    if (!navigator.geolocation) {
      alert('GPS no disponible en este navegador');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitud', pos.coords.latitude);
        setValue('longitud', pos.coords.longitude);
        setGpsLoading(false);
        setValue('ubicacion', `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`);
      },
      (err) => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 30000 }
    );
  };

  const onSubmit = async (data: ClienteFormData) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/clientes/${editingId}`, data);
      } else {
        await api.post('/clientes', data);
      }
      setModalOpen(false);
      fetchClientes();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.error || (data?.errors ? data.errors.map((e: any) => e.msg).join(', ') : null) || err?.message || 'Error al guardar cliente';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      fetchClientes();
    } catch {
      console.error('Error al eliminar cliente');
    }
  };

  const filtered = clientes.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.telefono.toLowerCase().includes(q) ||
      (c.dni_ruc || '').toLowerCase().includes(q)
    );
  });

  const estadoBadge = (estado: string | null | undefined) => {
    const e = estado || 'activo';
    const styles: Record<string, string> = {
      activo: 'bg-green-100 text-green-800',
      inactivo: 'bg-gray-100 text-gray-800',
      suspendido: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[e] || ''}`}>
        {e.charAt(0).toUpperCase() + e.slice(1)}
      </span>
    );
  };

  const tipoBadge = (tipo: string | null | undefined) => {
    const t = tipo || 'regular';
    const styles: Record<string, string> = {
      regular: 'bg-blue-100 text-blue-800',
      vip: 'bg-yellow-100 text-yellow-800',
      empresarial: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[t] || ''}`}>
        {t.charAt(0).toUpperCase() + t.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestión de clientes del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Users className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No se encontraron clientes</p>
            <p className="text-sm">{search ? 'Intenta con otro término de búsqueda' : 'Agrega tu primer cliente'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DNI/RUC</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dirección</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ubicación</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Foto</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{c.nombre}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{c.dni_ruc || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{c.telefono}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{c.direccion}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {c.ubicacion ? (
                            <a href={c.ubicacion} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm" title="Abrir en Google Maps">
                              <MapPin className="w-4 h-4" />
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : <span className="text-gray-300">-</span>}
                          <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 text-sm" title="Abrir WhatsApp">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {c.foto ? (
                          <button onClick={() => c.foto && setFotoModal(c.foto)} className="block w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-400 transition-all">
                            <img src={c.foto} alt="Foto vivienda" className="w-full h-full object-cover" />
                          </button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{tipoBadge(c.tipo_cliente)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{estadoBadge(c.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {esAdmin && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
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
              {filtered.map((c) => (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{c.nombre}</p>
                      <p className="text-sm text-gray-500">{c.telefono}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      {esAdmin && (
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    {c.dni_ruc && <span>DNI: {c.dni_ruc}</span>}
                    <span>{c.direccion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.ubicacion ? (
                      <a href={c.ubicacion} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs">
                        <MapPin className="w-3 h-3" /> Maps
                      </a>
                    ) : null}
                    <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-xs">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp
                    </a>
                  </div>
                  {c.foto && (
                    <button onClick={() => c.foto && setFotoModal(c.foto)} className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img src={c.foto} alt="Foto vivienda" className="w-full h-full object-cover" />
                    </button>
                  )}
                  <div className="flex gap-2">
                    {tipoBadge(c.tipo_cliente)}
                    {estadoBadge(c.estado)}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
              {filtered.length} de {clientes.length} cliente(s)
            </div>
          </>
        )}
      </div>

      {fotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setFotoModal(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFotoModal(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm">Cerrar ×</button>
            <img src={fotoModal} alt="Foto vivienda" className="w-full rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  {...register('nombre', { required: 'El nombre es obligatorio' })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nombre del cliente"
                />
                {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI/RUC</label>
                <input
                  {...register('dni_ruc')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input
                  {...register('telefono', { required: 'El teléfono es obligatorio' })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="999888777"
                />
                {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                <input
                  {...register('direccion', { required: 'La dirección es obligatoria' })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Av. Principal 123"
                />
                {errors.direccion && <p className="mt-1 text-xs text-red-600">{errors.direccion.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                <input
                  {...register('referencia')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Cerca del mercado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación (link Google Maps)</label>
                <div className="flex gap-2">
                  <input
                    {...register('ubicacion')}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="https://maps.app.goo.gl/..."
                  />
                  <button type="button" onClick={capturarGPS} disabled={gpsLoading} className="px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm" title="Capturar ubicación actual">
                    {gpsLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Navigation className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">Pega un link o presiona el botón GPS para capturar automáticamente</p>
              </div>

              <input type="hidden" {...register('latitud')} />
              <input type="hidden" {...register('longitud')} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto de la vivienda</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={capturarFoto} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                    <Camera className="w-4 h-4" />
                    Tomar Foto
                  </button>
                  {fotoPreview && (
                    <div className="relative">
                      <img src={fotoPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => { setValue('foto', ''); setFotoPreview(''); }} className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full text-xs">×</button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">Toma una foto de la vivienda para identificar al cliente</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente *</label>
                <select
                  {...register('tipo_cliente', { required: true })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                  <option value="empresarial">Empresarial</option>
                </select>
              </div>

              {submitError && (
                <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{submitError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
