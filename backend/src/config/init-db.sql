-- Script de inicialización de base de datos para Sistema de Agua
-- PostgreSQL

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS detalle_pedidos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS detalle_compras CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS kardex CASCADE;
DROP TABLE IF EXISTS creditos CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS bidones_cliente CASCADE;
DROP TABLE IF EXISTS consumo_cliente CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS repartidores CASCADE;
DROP TABLE IF EXISTS clientes_ruta CASCADE;
DROP TABLE IF EXISTS rutas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Tabla de usuarios (roles y autenticación)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'cajero', 'repartidor', 'supervisor')),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_sesion TIMESTAMP
);

-- Tabla de clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dni_ruc VARCHAR(20) UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    referencia VARCHAR(255),
    ubicacion TEXT,
    foto TEXT,
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    tipo_cliente VARCHAR(20) DEFAULT 'regular' CHECK (tipo_cliente IN ('regular', 'vip', 'empresarial')),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de proveedores
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    ruc VARCHAR(20),
    contacto VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos (bidones, tapas, sellos, agua tratada)
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    unidad_medida VARCHAR(20) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    precio_compra DECIMAL(10, 2),
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 10,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('bidon_lleno', 'bidon_vacio', 'tapa', 'sello', 'agua_tratada', 'otro')),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pedidos (pendientes de entrega)
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega TIMESTAMP,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'entregado', 'cancelado')),
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- Tabla de detalle de pedidos
CREATE TABLE detalle_pedidos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id),
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- Tabla de repartidores
CREATE TABLE repartidores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    placa_vehiculo VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de rutas
CREATE TABLE rutas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    repartidor_id INTEGER REFERENCES repartidores(id),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactiva')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clientes por ruta
CREATE TABLE clientes_ruta (
    id SERIAL PRIMARY KEY,
    ruta_id INTEGER REFERENCES rutas(id),
    cliente_id INTEGER REFERENCES clientes(id),
    orden_visita INTEGER DEFAULT 0,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ruta_id, cliente_id)
);

-- Tabla de compras
CREATE TABLE compras (
    id SERIAL PRIMARY KEY,
    proveedor_id INTEGER REFERENCES proveedores(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10, 2) NOT NULL,
    tipo_pago VARCHAR(20) CHECK (tipo_pago IN ('efectivo', 'transferencia', 'credito')),
    observaciones TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    estado VARCHAR(20) DEFAULT 'completada' CHECK (estado IN ('pendiente', 'completada', 'cancelada'))
);

-- Tabla de detalle de compras
CREATE TABLE detalle_compras (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER REFERENCES compras(id),
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- Tabla de ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    repartidor_id INTEGER REFERENCES repartidores(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_venta VARCHAR(20) NOT NULL CHECK (tipo_venta IN ('contado', 'credito')),
    tipo_pago VARCHAR(20) CHECK (tipo_pago IN ('efectivo', 'yape', 'transferencia', 'plin')),
    dias_plazo INTEGER DEFAULT 30,
    total DECIMAL(10, 2) NOT NULL,
    observaciones TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    estado VARCHAR(20) DEFAULT 'completada' CHECK (estado IN ('pendiente', 'completada', 'cancelada'))
);

-- Tabla de detalle de ventas
CREATE TABLE detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id),
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- Tabla de kardex (movimientos de inventario)
CREATE TABLE kardex (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id),
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'transferencia')),
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referencia VARCHAR(50),
    documento_id INTEGER,
    documento_tipo VARCHAR(20) CHECK (documento_tipo IN ('compra', 'venta', 'ajuste', 'transferencia')),
    observaciones TEXT
);

-- Tabla de créditos
CREATE TABLE creditos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    venta_id INTEGER REFERENCES ventas(id),
    monto_total DECIMAL(10, 2) NOT NULL,
    monto_pagado DECIMAL(10, 2) DEFAULT 0,
    monto_pendiente DECIMAL(10, 2) NOT NULL,
    fecha_credito TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_limite TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagado', 'vencido'))
);

-- Tabla de pagos
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    credito_id INTEGER REFERENCES creditos(id),
    monto DECIMAL(10, 2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_pago VARCHAR(20) CHECK (tipo_pago IN ('efectivo', 'yape', 'transferencia', 'plin')),
    observaciones TEXT,
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- Tabla de control de bidones por cliente
CREATE TABLE bidones_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    bidones_prestados INTEGER DEFAULT 0,
    bidones_entregados INTEGER DEFAULT 0,
    bidones_retornados INTEGER DEFAULT 0,
    bidones_perdidos INTEGER DEFAULT 0,
    saldo_bidones INTEGER DEFAULT 0,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cliente_id)
);

-- Tabla de consumo de agua por cliente (termómetro)
CREATE TABLE consumo_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    capacidad_total INTEGER NOT NULL, -- Capacidad total en litros
    consumo_actual INTEGER DEFAULT 0, -- Consumo actual en litros
    porcentaje_consumido DECIMAL(5, 2) DEFAULT 0,
    fecha_ultima_lectura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alerta_enviada BOOLEAN DEFAULT false,
    estado VARCHAR(20) DEFAULT 'normal' CHECK (estado IN ('normal', 'medio', 'critico', 'vacío'))
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_creditos_cliente ON creditos(cliente_id);
CREATE INDEX idx_creditos_estado ON creditos(estado);
CREATE INDEX idx_kardex_producto ON kardex(producto_id);
CREATE INDEX idx_kardex_fecha ON kardex(fecha);
CREATE INDEX idx_consumo_cliente ON consumo_cliente(cliente_id);
CREATE INDEX idx_consumo_estado ON consumo_cliente(estado);

-- Productos iniciales
INSERT INTO productos (nombre, descripcion, unidad_medida, precio_venta, precio_compra, stock_actual, stock_minimo, categoria) VALUES
('Bidón 20L Lleno', 'Bidón de 20 litros con agua', 'unidad', 8.00, 3.00, 100, 20, 'bidon_lleno'),
('Bidón 20L Vacío', 'Bidón de 20 litros vacío', 'unidad', 0.00, 2.00, 50, 10, 'bidon_vacio'),
('Tapa Bidón', 'Tapa para bidón de 20L', 'unidad', 1.00, 0.50, 200, 50, 'tapa'),
('Sello de Seguridad', 'Sello para bidón', 'unidad', 0.50, 0.20, 500, 100, 'sello');

-- Proveedor inicial
INSERT INTO proveedores (nombre, telefono, direccion, ruc, contacto) VALUES
('Planta Purificadora Central', '555-0001', 'Av. Principal 123', '20123456789', 'Juan Pérez');
