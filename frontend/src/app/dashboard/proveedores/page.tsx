'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { Proveedor } from '@/types';
import { useAuthStore } from '@/lib/store';
import { Plus, Edit, Trash2, Search, Truck, Building2, X } from 'lucide-react';

type ProveedorFormData = {
  nombre: string;
  telefono: string;
  direccion: string;
  ruc: string;
  contacto: string;
};

export default function ProveedoresPage() {
  const esAdmin = useAuthStore((s) => s.usuario)?.rol === 'admin';
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProveedorFormData>();

  const fetchProveedores = useCallback(async () => {
    try {
      const res = await api.get('/proveedores');
      setProveedores(res.data);
    } catch {
      console.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const openCreate = () => {
    setEditingId(null);
    reset({ nombre: '', telefono: '', direccion: '', ruc: '', contacto: '' });
    setModalOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setEditingId(p.id);
    setValue('nombre', p.nombre);
    setValue('telefono', p.telefono || '');
    setValue('direccion', p.direccion || '');
    setValue('ruc', p.ruc || '');
    setValue('contacto', p.contacto || '');
    setModalOpen(true);
  };

  const onSubmit = async (data: ProveedorFormData) => {
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/proveedores/${editingId}`, data);
      } else {
        await api.post('/proveedores', data);
      }
      setModalOpen(false);
      fetchProveedores();
    } catch {
      console.error('Error al guardar proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      fetchProveedores();
    } catch {
      console.error('Error al eliminar proveedor');
    }
  };

  const filtered = proveedores.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.ruc || '').toLowerCase().includes(q) ||
      (p.contacto || '').toLowerCase().includes(q)
    );
  });

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      activo: 'bg-green-100 text-green-800',
      inactivo: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado] || ''}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-gray-600 mt-1">Gestión de proveedores del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUC o contacto..."
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
            <Building2 className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No se encontraron proveedores</p>
            <p className="text-sm">{search ? 'Intenta con otro término de búsqueda' : 'Agrega tu primer proveedor'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dirección</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">RUC</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{p.nombre}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{p.telefono || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{p.direccion || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{p.ruc || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{p.contacto || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{estadoBadge(p.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {esAdmin && (
                            <button
                              onClick={() => handleDelete(p.id)}
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
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{p.nombre}</p>
                      <p className="text-sm text-gray-500">{p.telefono || '-'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      {esAdmin && (
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    {p.ruc && <span>RUC: {p.ruc}</span>}
                    {p.direccion && <span>{p.direccion}</span>}
                    {p.contacto && <span>Contacto: {p.contacto}</span>}
                  </div>
                  <div className="flex gap-2">
                    {estadoBadge(p.estado)}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
              {filtered.length} de {proveedores.length} proveedor(es)
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
                  placeholder="Nombre del proveedor"
                />
                {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  {...register('telefono')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="999888777"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  {...register('direccion')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Av. Principal 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                <input
                  {...register('ruc')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="12345678901"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                <input
                  {...register('contacto')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nombre de contacto"
                />
              </div>

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
                  {editingId ? 'Guardar Cambios' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
