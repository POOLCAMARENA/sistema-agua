'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Repartidor } from '@/types';
import { useAuthStore } from '@/lib/store';
import { Plus, Edit, Trash2, Truck, Phone, CreditCard } from 'lucide-react';

interface RepartidorForm {
  nombre: string;
  telefono: string;
  dni: string;
  placa_vehiculo: string;
}

const initialForm: RepartidorForm = {
  nombre: '',
  telefono: '',
  dni: '',
  placa_vehiculo: '',
};

export default function RepartidoresPage() {
  const esAdmin = useAuthStore((s) => s.usuario)?.rol === 'admin';
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Repartidor | null>(null);
  const [form, setForm] = useState<RepartidorForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRepartidores();
  }, []);

  const fetchRepartidores = async () => {
    try {
      const response = await api.get('/repartidores');
      setRepartidores(response.data);
    } catch {
      console.error('Error al cargar repartidores');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (repartidor: Repartidor) => {
    setEditing(repartidor);
    setForm({
      nombre: repartidor.nombre,
      telefono: repartidor.telefono,
      dni: repartidor.dni || '',
      placa_vehiculo: repartidor.placa_vehiculo || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editing) {
        await api.put(`/repartidores/${editing.id}`, form);
      } else {
        await api.post('/repartidores', form);
      }
      setModalOpen(false);
      fetchRepartidores();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar repartidor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este repartidor?')) return;
    try {
      await api.delete(`/repartidores/${id}`);
      fetchRepartidores();
    } catch {
      console.error('Error al eliminar repartidor');
    }
  };

  const toggleEstado = async (repartidor: Repartidor) => {
    const nuevoEstado = repartidor.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await api.put(`/repartidores/${repartidor.id}`, { ...repartidor, estado: nuevoEstado });
      fetchRepartidores();
    } catch {
      console.error('Error al cambiar estado');
    }
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Repartidores</h1>
          <p className="text-gray-600 mt-1">Gestión de repartidores del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Repartidor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Repartidor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">DNI</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Placa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {repartidores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <Truck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>No hay repartidores registrados</p>
                    <button onClick={openCreate} className="text-blue-600 hover:text-blue-800 font-medium mt-2 text-sm">
                      Crear el primer repartidor
                    </button>
                  </td>
                </tr>
              ) : (
                repartidores.map((repartidor) => (
                  <tr key={repartidor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Truck className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{repartidor.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {repartidor.telefono}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{repartidor.dni || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">
                      {repartidor.placa_vehiculo ? (
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                          {repartidor.placa_vehiculo}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleEstado(repartidor)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          repartidor.estado === 'activo'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {repartidor.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(repartidor)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {esAdmin && (
                          <button
                            onClick={() => handleDelete(repartidor.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-full">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? 'Editar Repartidor' : 'Nuevo Repartidor'}
                </h2>
                <p className="text-sm text-gray-500">
                  {editing ? 'Modifica los datos del repartidor' : 'Ingresa los datos del nuevo repartidor'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nombre del repartidor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Número de teléfono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                <input
                  type="text"
                  name="dni"
                  value={form.dni}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Documento de identidad"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placa Vehículo</label>
                <input
                  type="text"
                  name="placa_vehiculo"
                  value={form.placa_vehiculo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Placa del vehículo"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
