'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  Archive,
  Droplets,
  Building2,
  Map,
  Thermometer,
  FileText,
  LogOut,
  X,
  Menu,
  ClipboardList,
  Shield,
  Database
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pedidos', href: '/dashboard/pedidos', icon: ClipboardList },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { name: 'Ventas', href: '/dashboard/ventas', icon: ShoppingCart },
  { name: 'Compras', href: '/dashboard/compras', icon: Package },
  { name: 'Productos', href: '/dashboard/productos', icon: Archive },
  { name: 'Repartidores', href: '/dashboard/repartidores', icon: Truck },
  { name: 'Créditos', href: '/dashboard/creditos', icon: DollarSign },
  { name: 'Proveedores', href: '/dashboard/proveedores', icon: Building2 },
  { name: 'Rutas', href: '/dashboard/rutas', icon: Map },
  { name: 'Consumo', href: '/dashboard/consumo', icon: Thermometer },
  { name: 'Kardex', href: '/dashboard/kardex', icon: FileText },
  { name: 'Bidones', href: '/dashboard/bidones', icon: Droplets },
  { name: 'Usuarios', href: '/dashboard/usuarios', icon: Shield },
  { name: 'Backup', href: '/dashboard/admin', icon: Database },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { usuario, logout } = useAuthStore();

  const handleNav = () => {
    if (window.innerWidth < 768) onClose();
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Droplets className="w-6 h-6 text-blue-400" />
          Sistema Agua
        </h1>
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.filter(item => {
            if (item.name === 'Usuarios' && usuario?.rol !== 'admin') return false;
            if (item.name === 'Backup' && usuario?.rol !== 'admin') return false;
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={handleNav}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-4 px-4">
          <p className="text-sm text-slate-400">Usuario:</p>
          <p className="font-medium truncate">{usuario?.nombre}</p>
          <p className="text-xs text-slate-500 capitalize">{usuario?.rol}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col w-64 bg-slate-900 text-white min-h-screen">
        {sidebarContent}
      </div>
    </>
  );
}
