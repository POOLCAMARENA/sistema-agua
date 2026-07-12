'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Producto } from '@/types';
import { useAuthStore } from '@/lib/store';
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, X } from 'lucide-react';

type ProductoForm = {
  nombre: string;
  descripcion: string;
  unidad_medida: string;
  precio_venta: number;
  precio_compra: number;
  stock_actual: number;
  stock_minimo: number;
  categoria: Producto['categoria'];
};

const defaultForm: ProductoForm = {
  nombre: '',
  descripcion: '',
  unidad_medida: '',
  precio_venta: 0,
  precio_compra: 0,
  stock_actual: 0,
  stock_minimo: 0,
  categoria: 'bidon_lleno',
};

const categorias: { value: Producto['categoria']; label: string }[] = [
  { value: 'bidon_lleno', label: 'Bidón Lleno' },
  { value: 'bidon_vacio', label: 'Bidón Vacío' },
  { value: 'tapa', label: 'Tapa' },
  { value: 'sello', label: 'Sello' },
  { value: 'agua_tratada', label: 'Agua Tratada' },
  { value: 'otro', label: 'Otro' },
];

export default function ProductosPage() {
  const esAdmin = useAuthStore((s) => s.usuario)?.rol === 'admin';
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<ProductoForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      const { data } = await api.get('/productos');
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(defaultForm);
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (producto: Producto) => {
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      unidad_medida: producto.unidad_medida,
      precio_venta: producto.precio_venta,
      precio_compra: producto.precio_compra || 0,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      categoria: producto.categoria,
    });
    setEditing(producto);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/productos/${editing.id}`, form);
      } else {
        await api.post('/productos', form);
      }
      setShowModal(false);
      fetchProductos();
    } catch (error) {
      console.error('Error al guardar producto:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      fetchProductos();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  const filtered = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const categoriaLabel = (cat: Producto['categoria']) =>
    categorias.find((c) => c.value === cat)?.label || cat;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Categoría</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Precio Venta</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Precio Compra</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Stock Actual</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Stock Mínimo</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No se encontraron productos</p>
                  </td>
                </tr>
              ) : (
                filtered.map((producto) => {
                  const stockBajo = producto.stock_actual <= producto.stock_minimo;
                  return (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {producto.nombre}
                          {stockBajo && (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{categoriaLabel(producto.categoria)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">S/ {producto.precio_venta.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {producto.precio_compra ? `S/ ${producto.precio_compra.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-medium ${stockBajo ? 'text-red-600' : 'text-gray-900'}`}>
                          {producto.stock_actual}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{producto.stock_minimo}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            producto.estado === 'activo'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(producto)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {esAdmin && (
                            <button
                              onClick={() => handleDelete(producto.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(() => {
        const stockBajoCount = productos.filter((p) => p.stock_actual <= p.stock_minimo).length;
        if (stockBajoCount === 0) return null;
        return (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">
              {stockBajoCount} producto(s) con stock por debajo del mínimo.
            </p>
          </div>
        );
      })()}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                <input
                  type="text"
                  required
                  value={form.unidad_medida}
                  onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="ej. litro, unidad, kg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value as Producto['categoria'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {categorias.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={form.precio_venta}
                    onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Compra</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio_compra}
                    onChange={(e) => setForm({ ...form, precio_compra: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.stock_actual}
                    onChange={(e) => setForm({ ...form, stock_actual: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.stock_minimo}
                    onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
