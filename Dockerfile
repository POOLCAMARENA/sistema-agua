# ============================================
# Dockerfile - Sistema de Agua (Fly.io)
# Frontend + Backend unificados
# ============================================

# Stage 1: Build del frontend (Next.js)
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar package.json y package-lock.json
COPY frontend/package*.json ./

# Instalar dependencias (incluyendo devDependencies para build)
RUN npm ci --include=dev

# Copiar código fuente del frontend
COPY frontend/ .

# Construir el frontend en modo export estático
RUN npm run build

# Stage 2: Backend + archivos estáticos del frontend
FROM node:20-alpine

WORKDIR /app

# Copiar package.json y package-lock.json del backend
COPY backend/package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar código fuente del backend
COPY backend/ .

# Copiar archivos estáticos del frontend construido
# Next.js export genera archivos en 'out'
COPY --from=frontend-builder /app/frontend/out ./public

# Crear directorio para uploads
RUN mkdir -p uploads

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/server.js"]
