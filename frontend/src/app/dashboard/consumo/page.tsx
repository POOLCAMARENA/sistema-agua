'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { ConsumoCliente } from '@/types';
import { Thermometer, AlertTriangle, RefreshCw, Settings, Search, Gauge, X } from 'lucide-react';

type EstadoFiltro = '' | 'normal' | 'medio' | 'crítico' | 'vacío';

export default function ConsumoPage() {
  const [clientes, setClientes] = useState<ConsumoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalCriticos, setTotalCriticos] = useState(0);
  const [totalAlertas, setTotalAlertas] = useState(0);

  const [consumoModal, setConsumoModal] = useState<{ open: boolean; cliente: ConsumoCliente | null; valor: string }>({
    open: false, cliente: null, valor: '',
  });
  const [capacidadModal, setCapacidadModal] = useState<{ open: boolean; cliente: ConsumoCliente | null; valor: string }>({
    open: false, cliente: null, valor: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (estadoFiltro) params.estado = estadoFiltro;
      if (soloAlertas) params.alerta_pendiente = 'true';

      const [consumoRes, estadisticasRes, criticosRes, alertasRes] = await Promise.all([
        api.get('/consumo', { params }),
        api.get('/consumo/estadisticas'),
        api.get('/consumo/criticos'),
        api.get('/consumo/alertas'),
      ]);

      setClientes(consumoRes.data);
      setTotalClientes(estadisticasRes.data.total ?? 0);
      setTotalCriticos(criticosRes.data.total ?? 0);
      setTotalAlertas(alertasRes.data.total ?? 0);
    } catch {
      console.error('Error al cargar datos de consumo');
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, soloAlertas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActualizarConsumo = async () => {
    if (!consumoModal.cliente || !consumoModal.valor) return;
    setSubmitting(true);
    try {
      await api.put(`/consumo/cliente/${consumoModal.cliente.cliente_id}`, {
        consumo_actual: Number(consumoModal.valor),
      });
      setConsumoModal({ open: false, cliente: null, valor: '' });
      fetchData();
    } catch {
      console.error('Error al actualizar consumo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfigurarCapacidad = async () => {
    if (!capacidadModal.cliente || !capacidadModal.valor) return;
    setSubmitting(true);
    try {
      await api.put(`/consumo/cliente/${capacidadModal.cliente.cliente_id}/capacidad`, {
        capacidad_total: Number(capacidadModal.valor),
      });
      setCapacidadModal({ open: false, cliente: null, valor: '' });
      fetchData();
    } catch {
      console.error('Error al configurar capacidad');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = clientes.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.cliente_nombre || '').toLowerCase().includes(q) ||
      (c.cliente_telefono || '').toLowerCase().includes(q)
    );
  });

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-green-100 text-green-800',
      medio: 'bg-yellow-100 text-yellow-800',
      crítico: 'bg-orange-100 text-orange-800',
      vacío: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado] || ''}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  const progressBar = (porcentaje: number) => {
    let color = 'bg-green-500';
    if (porcentaje >= 90) color = 'bg-red-500';
    else if (porcentaje >= 70) color = 'bg-orange-500';
    else if (porcentaje >= 40) color = 'bg-yellow-500';

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 w-10 text-right">
          {porcentaje.toFixed(1)}%
        </span>
      </div>
    );
  };

  const summaryCards = [
    {
      title: 'Total Clientes',
      value: totalClientes,
      icon: Gauge,
      color: 'bg-blue-500',
    },
    {
      title: 'Clientes Críticos',
      value: totalCriticos,
      icon: Thermometer,
      color: 'bg-orange-500',
    },
    {
      title: 'Alertas Pendientes',
      value: totalAlertas,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Consumo de Agua</h1>
          <p className="text-gray-600 mt-1">Monitoreo de consumo por cliente</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
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
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Todos los estados</option>
                <option value="normal">Normal</option>
                <option value="medio">Medio</option>
                <option value="crítico">Crítico</option>
                <option value="vacío">Vacío</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={soloAlertas}
                  onChange={(e) => setSoloAlertas(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Solo alertas pendientes
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Thermometer className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No se encontraron registros</p>
            <p className="text-sm">{search ? 'Intenta con otro término de búsqueda' : 'No hay clientes con consumo registrado'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacidad Total</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Consumo Actual</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">% Consumido</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{c.cliente_nombre || `Cliente #${c.cliente_id}`}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{c.cliente_telefono || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{c.capacidad_total} L</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{c.consumo_actual} L</td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[160px]">{progressBar(c.porcentaje_consumido)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{estadoBadge(c.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConsumoModal({ open: true, cliente: c, valor: String(c.consumo_actual) })}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Actualizar Consumo"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCapacidadModal({ open: true, cliente: c, valor: String(c.capacidad_total) })}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Configurar Capacidad"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {filtered.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{c.cliente_nombre || `Cliente #${c.cliente_id}`}</p>
                      <p className="text-sm text-gray-500">{c.cliente_telefono || '-'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConsumoModal({ open: true, cliente: c, valor: String(c.consumo_actual) })}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Actualizar Consumo"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCapacidadModal({ open: true, cliente: c, valor: String(c.capacidad_total) })}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Configurar Capacidad"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>Capacidad: {c.capacidad_total} L</span>
                    <span>Consumo: {c.consumo_actual} L</span>
                    {estadoBadge(c.estado)}
                  </div>
                  {progressBar(c.porcentaje_consumido)}
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
              {filtered.length} de {clientes.length} registro(s)
            </div>
          </>
        )}
      </div>

      {consumoModal.open && consumoModal.cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConsumoModal({ open: false, cliente: null, valor: '' })}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Actualizar Consumo</h2>
              <button onClick={() => setConsumoModal({ open: false, cliente: null, valor: '' })} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600">
                Cliente: <span className="font-medium text-gray-900">{consumoModal.cliente.cliente_nombre || `#${consumoModal.cliente.cliente_id}`}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consumo Actual (litros)</label>
                <input
                  type="number"
                  min="0"
                  value={consumoModal.valor}
                  onChange={(e) => setConsumoModal({ ...consumoModal, valor: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConsumoModal({ open: false, cliente: null, valor: '' })}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleActualizarConsumo}
                  disabled={submitting || !consumoModal.valor}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {capacidadModal.open && capacidadModal.cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCapacidadModal({ open: false, cliente: null, valor: '' })}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Configurar Capacidad</h2>
              <button onClick={() => setCapacidadModal({ open: false, cliente: null, valor: '' })} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600">
                Cliente: <span className="font-medium text-gray-900">{capacidadModal.cliente.cliente_nombre || `#${capacidadModal.cliente.cliente_id}`}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad Total (litros)</label>
                <input
                  type="number"
                  min="0"
                  value={capacidadModal.valor}
                  onChange={(e) => setCapacidadModal({ ...capacidadModal, valor: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCapacidadModal({ open: false, cliente: null, valor: '' })}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfigurarCapacidad}
                  disabled={submitting || !capacidadModal.valor}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
