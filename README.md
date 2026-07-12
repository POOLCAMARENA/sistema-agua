# Sistema Administrativo de Agua

Sistema web responsive para la administración de distribución de agua con control de inventario, créditos, reparto y consumo.

## 📋 Características

### Módulos Implementados

- **👥 Clientes**: Gestión completa con GPS, tipos de cliente y estados
- **🛒 Ventas**: Registro de ventas con kardex automático, contado y crédito
- **📦 Compras**: Registro de compras con actualización automática de inventario
- **📊 Kardex/Inventario**: Control de movimientos de productos en tiempo real
- **💰 Créditos y Cobranza**: Sistema de créditos con pagos parciales y seguimiento
- **🚚 Reparto/Rutas**: Gestión de repartidores y rutas de entrega
- **🫗 Control de Bidones**: Seguimiento de bidones por cliente (entregas, retornos, pérdidas)
- **🌡️ Termómetro de Consumo**: Alertas automáticas cuando el consumo del cliente llega a niveles críticos
- **📈 Dashboard**: Panel administrativo con estadísticas en tiempo real

### Funcionalidades Especiales

- ✅ **Responsive**: Funciona en PCs, tablets y celulares
- ✅ **Roles de Usuario**: Admin, Cajero, Repartidor, Supervisor
- ✅ **Autenticación JWT**: Seguridad en todas las rutas
- ✅ **Kardex Automático**: Actualización automática de inventario
- ✅ **Alertas de Consumo**: Notificaciones cuando el agua del cliente está por acabarse
- ✅ **Control de Bidones Retornables**: Evita pérdidas de bidones
- ✅ **Base de Datos PostgreSQL**: Escalable y robusta

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Frontend      │
│   Next.js 14    │
│   TypeScript    │
│   TailwindCSS   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│   Backend      │
│   Node.js      │
│   Express      │
│   JWT Auth     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL   │
│   Database     │
└─────────────────┘
```

## 🚀 Instalación

### Requisitos Previos

- Node.js 18+ 
- PostgreSQL 12+
- npm o yarn

### 1. Clonar el proyecto

```bash
cd C:\Users\user\CascadeProjects\sistema-agua-web
```

### 2. Configurar Base de Datos PostgreSQL

#### En Windows Server:

1. Instalar PostgreSQL si no está instalado
2. Crear una base de datos llamada `sistema_agua`
3. Ejecutar el script de inicialización:

```bash
cd backend
psql -U postgres -d sistema_agua -f src/config/init-db.sql
```

O usando pgAdmin:
- Abre pgAdmin
- Conecta a tu servidor PostgreSQL
- Crea la base de datos `sistema_agua`
- Abre Query Tool y ejecuta el archivo `backend/src/config/init-db.sql`

### 3. Configurar Backend

```bash
cd backend
npm install
```

Crear archivo `.env`:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_agua
DB_USER=postgres
DB_PASSWORD=tu_contraseña

JWT_SECRET=tu_secreto_jwt_muy_seguro
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:3000
```

Iniciar backend:

```bash
npm run dev
```

El backend estará disponible en `http://localhost:3001`

### 4. Configurar Frontend

```bash
cd frontend
npm install
```

Crear archivo `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Iniciar frontend:

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## 🔐 Credenciales por Defecto

El sistema incluye usuarios de prueba creados automáticamente:

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@sistemaagua.com | password |
| Cajero | cajero@sistemaagua.com | password |
| Repartidor | repartidor@sistemaagua.com | password |

⚠️ **Importante**: Cambia estas contraseñas en producción

## 📱 Uso en Dispositivos Móviles

Para acceder desde celulares en la misma red:

1. Asegúrate de que el servidor y el dispositivo móvil estén en la misma red
2. Encuentra la IP de tu servidor (ej: `192.168.1.100`)
3. En el celular, accede a: `http://192.168.1.100:3000`
4. Configura CORS en el backend para permitir la IP del celular

## 🗄️ Estructura de Base de Datos

### Tablas Principales

- **usuarios**: Usuarios del sistema con roles
- **clientes**: Información de clientes con GPS
- **productos**: Bidones, tapas, sellos, agua tratada
- **proveedores**: Proveedores de productos
- **ventas**: Registro de ventas
- **detalle_ventas**: Detalles de cada venta
- **compras**: Registro de compras
- **detalle_compras**: Detalles de cada compra
- **kardex**: Movimientos de inventario
- **creditos**: Créditos a clientes
- **pagos**: Pagos de créditos
- **repartidores**: Repartidores del sistema
- **rutas**: Rutas de reparto
- **clientes_ruta**: Asignación de clientes a rutas
- **bidones_cliente**: Control de bidones por cliente
- **consumo_cliente**: Termómetro de consumo por cliente

## 🔧 Configuración en Producción

### Backend

1. Cambiar `NODE_ENV=production`
2. Usar una base de datos PostgreSQL en producción
3. Configurar un JWT_SECRET seguro
4. Configurar CORS con el dominio de producción
5. Usar un proceso manager como PM2

```bash
npm install -g pm2
pm2 start src/server.js --name "sistema-agua-api"
pm2 save
pm2 startup
```

### Frontend

1. Construir para producción:

```bash
npm run build
npm start
```

2. Usar Nginx o Apache como reverse proxy
3. Configurar HTTPS con SSL

### Backup Automático de Base de Datos

Crear un script de backup en Windows:

```batch
@echo off
set PGUSER=postgres
set PGPASSWORD=tu_contraseña
set PGDATABASE=sistema_agua
set BACKUP_DIR=C:\backups\sistema_agua
set DATE=%date:~-4,4%%date:~-7,2%%date:~-10,2%

pg_dump -U %PGUSER% %PGDATABASE% > %BACKUP_DIR%\backup_%DATE%.sql
```

Programar este script en el Programador de Tareas de Windows para ejecutarse diariamente.

## 📊 Flujo Operativo

### 1. Registro de Clientes
- Crear cliente con nombre, teléfono, dirección
- Opcional: Agregar ubicación GPS
- Asignar tipo de cliente (regular, VIP, empresarial)

### 2. Configuración de Consumo (Termómetro)
- Para cada cliente, configurar capacidad total del tanque
- El sistema calculará automáticamente el porcentaje de consumo
- Enviará alertas cuando llegue a 75%, 90% y 100%

### 3. Registro de Ventas
- Seleccionar cliente
- Agregar productos (bidones llenos)
- Seleccionar tipo: Contado o Crédito
- Si es crédito, se crea automáticamente el registro de crédito
- El kardex se actualiza automáticamente (salida de productos)

### 4. Control de Bidones
- Registrar entrega de bidones al cliente
- Registrar retorno de bidones vacíos
- Registrar pérdidas si aplica
- El sistema mantiene el saldo de bidones por cliente

### 5. Cobranza de Créditos
- Ver créditos pendientes
- Registrar pagos parciales o totales
- El sistema actualiza automáticamente el estado del crédito

### 6. Reparto
- Asignar clientes a rutas
- Asignar repartidores a rutas
- Ver estadísticas de ventas por repartidor

## 🛠️ Tecnologías

### Backend
- Node.js 18+
- Express.js
- PostgreSQL
- JWT (JSON Web Tokens)
- bcryptjs (encriptación de passwords)
- CORS
- Helmet (seguridad)

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Axios (HTTP client)
- Zustand (state management)
- Lucide React (iconos)
- Recharts (gráficos)

## 📝 Próximas Mejoras (Roadmap)

### Fase 2
- [ ] Gráficos interactivos en el dashboard
- [ ] Reportes PDF exportables
- [ ] Búsqueda avanzada con filtros
- [ ] Paginación en todas las listas

### Fase 3
- [ ] Integración con WhatsApp para alertas
- [ ] Facturación electrónica (SUNAT)
- [ ] Módulo de caja chica
- [ ] Auditoría de cambios

### Fase 4
- [ ] App móvil híbrida (React Native)
- [ ] GPS en tiempo real para repartidores
- [ ] Firma digital en entregas
- [ ] Notificaciones push

## 🐛 Troubleshooting

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en `.env`
- Verifica que la base de datos exista

### Error: "CORS policy"
- Verifica la configuración de CORS en el backend
- Asegúrate de que el origen esté permitido

### Error: "Token inválido"
- Cierra sesión y vuelve a iniciar
- Verifica que el JWT_SECRET sea el mismo en backend y frontend

## 📄 Licencia

Este proyecto es propiedad privada. Todos los derechos reservados.

## 👨‍💻 Soporte

Para soporte técnico, contacta al equipo de desarrollo.

---

**Desarrollado con 💙 para la distribución de agua**
