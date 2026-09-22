FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --include=dev
COPY frontend/ .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .
COPY --from=frontend-builder /app/frontend/out ./public

RUN mkdir -p uploads

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "src/server.js"]