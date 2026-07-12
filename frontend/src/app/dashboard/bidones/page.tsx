'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { BidonCliente } from '@/types';
import {
  Droplets,
  Plus,
  Minus,
  AlertTriangle,
  Search,
  RotateCcw,
} from 'lucide-react';

interface EstadisticasBidones {
  total_clientes_con_prestamo: number;
  total_bidones_entregados: number;
  saldo_actual_total: number;
}

export default function BidonesPage() {
  const [bidones, setBidones] = useState<BidonCliente[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasBidones | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<{
    open: boolean;
    type: 'entrega' | 'retorno' | 'perdida' | null;
    cliente: BidonCliente | null;
    cantidad: number;
    submitting: boolean;
  }>({
    open: false,
    type: null,
    cliente: null,
    cantidad: 1,
    submitting: false,
  });

  const fetchData = useCallback(async () => {
    try {
      const [bidonesRes, statsRes] = await Promise.all([
        api.get('/bidones'),
        api.get('/bidones/estadisticas'),
      ]);
      setBidones(bidonesRes.data);
      setEstadisticas(statsRes.data);
    } catch (err) {
      console.error('Error fetching bidones data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBidones = bidones.filter(
    (b) =>
      b.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.cliente_telefono?.includes(searchTerm) ||
      b.direccion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (
    type: 'entrega' | 'retorno' | 'perdida',
    cliente: BidonCliente
  ) => {
    setModal({ open: true, type, cliente, cantidad: 1, submitting: false });
  };

  const closeModal = () => {
    setModal({ open: false, type: null, cliente: null, cantidad: 1, submitting: false });
  };

  const handleSubmit = async () => {
    if (!modal.cliente || !modal.type || modal.cantidad < 1) return;

    setModal((prev) => ({ ...prev, submitting: true }));

    try {
      await api.post(
        `/bidones/cliente/${modal.cliente.cliente_id}/${modal.type}`,
        { cantidad: modal.cantidad }
      );
      await fetchData();
      closeModal();
    } catch (err) {
      console.error(`Error registering ${modal.type}:`, err);
    } finally {
      setModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Clientes con Préstamo',
      value: estadisticas?.total_clientes_con_prestamo ?? bidones.length,
      icon: Droplets,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Bidones Entregados',
      value: estadisticas?.total_bidones_entregados ?? bidones.reduce((s, b) => s + b.bidones_entregados, 0),
      icon: Plus,
      color: 'bg-green-500',
    },
    {
      label: 'Saldo Actual Total',
      value: estadisticas?.saldo_actual_total ?? bidones.reduce((s, b) => s + b.saldo_bidones, 0),
      icon: RotateCcw,
      color: 'bg-cyan-500',
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Bidones</h1>
        <p className="text-gray-600 mt-1">Control de préstamo y retorno de bidones</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Dirección</th>
                <th className="text-center px-4 py-3 font-semibold">Entregados</th>
                <th className="text-center px-4 py-3 font-semibold">Retornados</th>
                <th className="text-center px-4 py-3 font-semibold">Perdidos</th>
                <th className="text-center px-4 py-3 font-semibold">Saldo</th>
                <th className="text-center px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBidones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    {searchTerm
                      ? 'No se encontraron clientes con ese criterio de búsqueda'
                      : 'No hay clientes con préstamo de bidones'}
                  </td>
                </tr>
              ) : (
                filteredBidones.map((bidon) => (
                  <tr key={bidon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span>{bidon.cliente_nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{bidon.cliente_telefono}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[200px] truncate">{bidon.direccion}</td>
                    <td className="px-4 py-3 text-center font-semibold text-green-600">{bidon.bidones_entregados}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{bidon.bidones_retornados}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">{bidon.bidones_perdidos}</td>
                    <td className="px-4 py-3 text-center font-semibold">{bidon.saldo_bidones}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openModal('entrega', bidon)}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          title="Registrar Entrega"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('retorno', bidon)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Registrar Retorno"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('perdida', bidon)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Registrar Pérdida"
                        >
                          <AlertTriangle className="w-4 h-4" />
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

      {modal.open && modal.cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              {modal.type === 'entrega' && <Plus className="w-6 h-6 text-green-600" />}
              {modal.type === 'retorno' && <RotateCcw className="w-6 h-6 text-blue-600" />}
              {modal.type === 'perdida' && <AlertTriangle className="w-6 h-6 text-red-600" />}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Registrar {modal.type === 'entrega' ? 'Entrega' : modal.type === 'retorno' ? 'Retorno' : 'Pérdida'}
                </h3>
                <p className="text-sm text-gray-600">{modal.cliente.cliente_nombre}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad de bidones
                </label>
                <input
                  type="number"
                  min={1}
                  value={modal.cantidad}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      cantidad: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Saldo actual: <span className="font-semibold text-gray-900">{modal.cliente.saldo_bidones}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={modal.submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={modal.submitting || modal.cantidad < 1}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {modal.submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {modal.type === 'entrega' ? 'Registrar Entrega' : modal.type === 'retorno' ? 'Registrar Retorno' : 'Registrar Pérdida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
