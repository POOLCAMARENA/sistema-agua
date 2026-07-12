export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'cajero' | 'repartidor' | 'supervisor';
  telefono?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  dni_ruc?: string;
  telefono: string;
  direccion: string;
  referencia?: string;
  ubicacion?: string;
  foto?: string;
  latitud?: number;
  longitud?: number;
  tipo_cliente: 'regular' | 'vip' | 'empresarial';
  estado: 'activo' | 'inactivo' | 'suspendido';
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  precio_venta: number;
  precio_compra?: number;
  stock_actual: number;
  stock_minimo: number;
  categoria: 'bidon_lleno' | 'bidon_vacio' | 'tapa' | 'sello' | 'agua_tratada' | 'otro';
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  ruc?: string;
  contacto?: string;
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
}

export interface Repartidor {
  id: number;
  nombre: string;
  telefono: string;
  dni?: string;
  placa_vehiculo?: string;
  estado: 'activo' | 'inactivo';
  fecha_creacion: string;
}

export interface Venta {
  id: number;
  cliente_id: number;
  repartidor_id?: number;
  fecha: string;
  tipo_venta: 'contado' | 'credito';
  tipo_pago?: 'efectivo' | 'yape' | 'transferencia' | 'plin';
  total: number;
  observaciones?: string;
  usuario_id: number;
  estado: 'pendiente' | 'completada' | 'cancelada';
  cliente_nombre?: string;
  repartidor_nombre?: string;
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_nombre?: string;
}

export interface Compra {
  id: number;
  proveedor_id: number;
  fecha: string;
  total: number;
  tipo_pago?: 'efectivo' | 'transferencia' | 'credito';
  observaciones?: string;
  usuario_id: number;
  estado: 'pendiente' | 'completada' | 'cancelada';
  proveedor_nombre?: string;
}

export interface Credito {
  id: number;
  cliente_id: number;
  venta_id: number;
  monto_total: number;
  monto_pagado: number;
  monto_pendiente: number;
  fecha_credito: string;
  fecha_limite?: string;
  estado: 'pendiente' | 'parcial' | 'pagado' | 'vencido';
  cliente_nombre?: string;
  cliente_telefono?: string;
}

export interface BidonCliente {
  id: number;
  cliente_id: number;
  bidones_prestados: number;
  bidones_entregados: number;
  bidones_retornados: number;
  bidones_perdidos: number;
  saldo_bidones: number;
  fecha_actualizacion: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  direccion?: string;
}

export interface ConsumoCliente {
  id: number;
  cliente_id: number;
  capacidad_total: number;
  consumo_actual: number;
  porcentaje_consumido: number;
  fecha_ultima_lectura: string;
  alerta_enviada: boolean;
  estado: 'normal' | 'medio' | 'crítico' | 'vacío';
  cliente_nombre?: string;
  cliente_telefono?: string;
  direccion?: string;
}

export interface Pedido {
  id: number;
  cliente_id: number;
  fecha_creacion: string;
  fecha_entrega?: string;
  total: number;
  observaciones?: string;
  estado: 'pendiente' | 'entregado' | 'cancelado';
  usuario_id: number;
  cliente_nombre?: string;
  cliente_telefono?: string;
  cliente_direccion?: string;
  cliente_ubicacion?: string;
  cliente_referencia?: string;
}

export interface DetallePedido {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_nombre?: string;
}

export interface Dashboard {
  ventas: {
    total_ventas: number;
    ventas_contado: number;
    ventas_credito: number;
    total_ingresos: number;
  };
  ventas_por_tipo_pago: Array<{
    tipo_pago: string;
    cantidad: number;
    total: number;
  }>;
  compras: {
    total_compras: number;
    total_gastado: number;
  };
  clientes: {
    total: number;
    activos: number;
    vip: number;
  };
  productos: {
    total: number;
    activos: number;
    stock_total: number;
    stock_bajo: number;
  };
  creditos: {
    total: number;
    total_pendiente: number;
    vencidos: number;
  };
  bidones: {
    saldo_actual: number;
    clientes_con_prestamo: number;
  };
  consumo: {
    total: number;
    criticos: number;
    vacios: number;
    alertas_pendientes: number;
  };
  periodo: {
    inicio: string;
    fin: string;
  };
}
