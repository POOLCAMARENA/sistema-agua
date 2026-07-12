'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Credito } from '@/types';
import {
  DollarSign,
  Plus,
  Eye,
  Search,
  AlertTriangle,
  CheckCircle,
  X,
  CreditCard,
  Calendar,
  User,
  Phone,
  FileText,
  Loader2
} from 'lucide-react';

interface Pago {
  id: number;
  credito_id: number;
  monto: number;
  tipo_pago: 'efectivo' | 'yape' | 'transferencia' | 'plin';
  observaciones?: string;
  fecha_pago: string;
  usuario_id: number;
}

interface CreditosStats {
  total_pendiente: number;
  total_vencido: number;
  total_pagado: number;
  cantidad_pendiente: number;
  cantidad_vencido: number;
  cantidad_pagado: number;
}

const estadoColors: Record<string, string> = {
  pendiente: 'bg-orange-100 text-orange-800 border-orange-200',
  parcial: 'bg-blue-100 text-blue-800 border-blue-200',
  pagado: 'bg-green-100 text-green-800 border-green-200',
  vencido: 'bg-red-100 text-red-800 border-red-200',
};

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
  vencido: 'Vencido',
};

export default function CreditosPage() {
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [stats, setStats] = useState<CreditosStats | null>(null);
  const [vencidos, setVencidos] = useState<Credito[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<string>('');

  const [detalleCredito, setDetalleCredito] = useState<Credito | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const [pagoCredito, setPagoCredito] = useState<Credito | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [tipoPago, setTipoPago] = useState<'efectivo' | 'yape' | 'transferencia' | 'plin'>('efectivo');
  const [observacionesPago, setObservacionesPago] = useState('');
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [creditosRes, statsRes, vencidosRes] = await Promise.all([
        api.get('/creditos'),
        api.get('/creditos/estadisticas'),
        api.get('/creditos/vencidos'),
      ]);
      setCreditos(creditosRes.data);
      setStats(statsRes.data);
      setVencidos(vencidosRes.data);
    } catch (error) {
      console.error('Error al cargar créditos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPagos = async (creditoId: number) => {
    setLoadingPagos(true);
    try {
      const res = await api.get(`/creditos/${creditoId}/pagos`);
      setPagos(res.data);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      setPagos([]);
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleVerDetalle = async (credito: Credito) => {
    setDetalleCredito(credito);
    setShowDetailModal(true);
    await fetchPagos(credito.id);
  };

  const handleRegistrarPago = (credito: Credito) => {
    setPagoCredito(credito);
    setMontoPago('');
    setTipoPago('efectivo');
    setObservacionesPago('');
    setShowPagoModal(true);
  };

  const handleSubmitPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoCredito) return;

    setRegistrando(true);
    try {
      await api.post(`/creditos/${pagoCredito.id}/pagos`, {
        monto: parseFloat(montoPago),
        tipo_pago: tipoPago,
        observaciones: observacionesPago || undefined,
      });
      setShowPagoModal(false);
      await fetchData();
      if (detalleCredito?.id === pagoCredito.id) {
        await fetchPagos(pagoCredito.id);
        const updated = await api.get(`/creditos/${pagoCredito.id}`);
        setDetalleCredito(updated.data);
      }
    } catch (error) {
      console.error('Error al registrar pago:', error);
    } finally {
      setRegistrando(false);
    }
  };

  const creditosFiltrados = creditos.filter((c) => {
    if (filtroEstado && c.estado !== filtroEstado) return false;
    if (filtroCliente) {
      const term = filtroCliente.toLowerCase();
      const matchNombre = c.cliente_nombre?.toLowerCase().includes(term);
      const matchTelefono = c.cliente_telefono?.includes(term);
      if (!matchNombre && !matchTelefono) return false;
    }
    return true;
  });

  const formatMoneda = (val: number) =>
    `S/ ${(val ?? 0).toFixed(2)}`;

  const formatFecha = (fecha?: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const montoRestante = pagoCredito ? pagoCredito.monto_pendiente : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Créditos</h1>
        <p className="text-gray-600 mt-1">Gestión de créditos y cobranzas</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Pendiente Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoneda(stats.total_pendiente)}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.cantidad_pendiente} créditos</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Vencido Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoneda(stats.total_vencido)}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.cantidad_vencido} créditos</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Pagado Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoneda(stats.total_pagado)}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.cantidad_pagado} créditos</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {vencidos.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Deudas Vencidas</h3>
              <p className="text-sm text-red-700">{vencidos.length} créditos requieren cobranza inmediata</p>
            </div>
          </div>
          <div className="space-y-2">
            {vencidos.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-red-100/50 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-red-900">{v.cliente_nombre || `Cliente #${v.cliente_id}`}</span>
                <span className="text-red-700 font-semibold">{formatMoneda(v.monto_pendiente)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o teléfono..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 font-semibold text-gray-600">ID</th>
                <th className="text-left px-4 md:px-6 py-3 font-semibold text-gray-600">Cliente</th>
                <th className="text-right px-4 md:px-6 py-3 font-semibold text-gray-600">Monto Total</th>
                <th className="text-right px-4 md:px-6 py-3 font-semibold text-gray-600">Pagado</th>
                <th className="text-right px-4 md:px-6 py-3 font-semibold text-gray-600">Pendiente</th>
                <th className="text-left px-4 md:px-6 py-3 font-semibold text-gray-600">Fecha Límite</th>
                <th className="text-center px-4 md:px-6 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-center px-4 md:px-6 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {creditosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 md:px-6 py-12 text-center text-gray-500">
                    No se encontraron créditos
                  </td>
                </tr>
              ) : (
                creditosFiltrados.map((credito) => (
                  <tr key={credito.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 font-medium text-gray-900">#{credito.id}</td>
                    <td className="px-4 md:px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{credito.cliente_nombre || '—'}</p>
                        {credito.cliente_telefono && (
                          <p className="text-xs text-gray-500">{credito.cliente_telefono}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right font-medium">{formatMoneda(credito.monto_total)}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-green-600 font-medium">{formatMoneda(credito.monto_pagado)}</td>
                    <td className="px-4 md:px-6 py-4 text-right font-semibold">{formatMoneda(credito.monto_pendiente)}</td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex flex-col">
                        <span>{formatFecha(credito.fecha_limite)}</span>
                        {credito.fecha_limite && (() => {
                          const ahora = new Date();
                          const limite = new Date(credito.fecha_limite);
                          const diff = Math.ceil((limite.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
                          if (diff < 0) {
                            return <span className="text-xs font-semibold text-red-600">{Math.abs(diff)} días vencido</span>;
                          }
                          if (diff <= 5) {
                            return <span className="text-xs font-semibold text-orange-600">Vence en {diff} día{diff === 1 ? '' : 's'}</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${estadoColors[credito.estado] || ''}`}>
                        {estadoLabels[credito.estado] || credito.estado}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleVerDetalle(credito)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Detalle
                        </button>
                        {credito.estado !== 'pagado' && (
                          <button
                            onClick={() => handleRegistrarPago(credito)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Registrar Pago
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

      {showDetailModal && detalleCredito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Detalle del Crédito</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">ID</p>
                  <p className="font-medium text-gray-900">#{detalleCredito.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Estado</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border mt-1 ${estadoColors[detalleCredito.estado] || ''}`}>
                    {estadoLabels[detalleCredito.estado] || detalleCredito.estado}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Cliente</p>
                  <p className="font-medium text-gray-900">{detalleCredito.cliente_nombre || '—'}</p>
                  {detalleCredito.cliente_telefono && (
                    <p className="text-sm text-gray-500">{detalleCredito.cliente_telefono}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Monto Total</p>
                  <p className="font-medium text-gray-900">{formatMoneda(detalleCredito.monto_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Monto Pendiente</p>
                  <p className="font-semibold text-red-600">{formatMoneda(detalleCredito.monto_pendiente)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha Crédito</p>
                  <p className="font-medium text-gray-900">{formatFecha(detalleCredito.fecha_credito)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha Límite</p>
                  <p className="font-medium text-gray-900">{formatFecha(detalleCredito.fecha_limite)}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Pagos Realizados</h3>
                {loadingPagos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : pagos.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No se han registrado pagos</p>
                ) : (
                  <div className="space-y-2">
                    {pagos.map((pago) => (
                      <div key={pago.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatMoneda(pago.monto)}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>{formatFecha(pago.fecha_pago)}</span>
                            <span className="capitalize">• {pago.tipo_pago}</span>
                          </div>
                          {pago.observaciones && (
                            <p className="text-xs text-gray-400 mt-0.5">{pago.observaciones}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {detalleCredito.estado !== 'pagado' && (
              <div className="p-4 md:p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleRegistrarPago(detalleCredito);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Pago
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showPagoModal && pagoCredito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPagoModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Registrar Pago</h2>
              <button onClick={() => setShowPagoModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitPago} className="p-4 md:p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm text-gray-600">
                  Cliente: <span className="font-medium text-gray-900">{pagoCredito.cliente_nombre || '—'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Monto pendiente: <span className="font-semibold text-red-600">{formatMoneda(montoRestante)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={montoRestante}
                    required
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago *</label>
                <select
                  value={tipoPago}
                   onChange={(e) => setTipoPago(e.target.value as 'efectivo' | 'yape' | 'transferencia' | 'plin')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="plin">Plin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={observacionesPago}
                  onChange={(e) => setObservacionesPago(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Observaciones del pago..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPagoModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registrando || !montoPago || parseFloat(montoPago) <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registrando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {registrando ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
