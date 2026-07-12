'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Dashboard as DashboardType } from '@/types';
import { 
  Users, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  Droplets,
  ArrowUpRight
} from 'lucide-react';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Error al cargar el dashboard</p>
      </div>
    );
  }

  const stats = [
    {
      title: 'Ventas Totales',
      value: dashboard.ventas.total_ventas,
      subtitle: `S/ ${dashboard.ventas.total_ingresos?.toFixed(2) || '0.00'}`,
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      title: 'Clientes Activos',
      value: dashboard.clientes.activos,
      subtitle: `${dashboard.clientes.vip} VIP`,
      icon: Users,
      color: 'green',
    },
    {
      title: 'Productos',
      value: dashboard.productos.activos,
      subtitle: `${dashboard.productos.stock_bajo} con stock bajo`,
      icon: Package,
      color: 'purple',
    },
    {
      title: 'Créditos Pendientes',
      value: dashboard.creditos.total,
      subtitle: `S/ ${dashboard.creditos.total_pendiente?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'orange',
    },
    {
      title: 'Bidones Prestados',
      value: dashboard.bidones.saldo_actual || 0,
      subtitle: `${dashboard.bidones.clientes_con_prestamo || 0} clientes`,
      icon: Droplets,
      color: 'cyan',
    },
    {
      title: 'Alertas de Consumo',
      value: dashboard.consumo.alertas_pendientes || 0,
      subtitle: `${dashboard.consumo.criticos || 0} críticos`,
      icon: AlertTriangle,
      color: 'red',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
    red: 'bg-red-500',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`${colorClasses[stat.color as keyof typeof colorClasses]} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Ventas</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ventas al contado</span>
              <span className="font-semibold">{dashboard.ventas.ventas_contado}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ventas al crédito</span>
              <span className="font-semibold">{dashboard.ventas.ventas_credito}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total ventas</span>
              <span className="font-semibold">S/ {dashboard.ventas.total_ingresos?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Por tipo de pago</p>
              <div className="space-y-2">
                {(dashboard.ventas_por_tipo_pago || []).length === 0 ? (
                  <p className="text-sm text-gray-400">Sin datos</p>
                ) : (
                  (dashboard.ventas_por_tipo_pago || []).map((item: any) => (
                    <div key={item.tipo_pago} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 capitalize">{item.tipo_pago || 'Sin registro'}</span>
                      <span className="font-medium text-gray-900">S/ {Number(item.total).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Compras</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total de compras</span>
              <span className="font-semibold">{dashboard.compras.total_compras}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total gastado</span>
              <span className="font-semibold">S/ {dashboard.compras.total_gastado?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      {dashboard.creditos.vencidos > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Créditos Vencidos</h3>
              <p className="text-red-700">Tienes {dashboard.creditos.vencidos} créditos vencidos por cobrar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
