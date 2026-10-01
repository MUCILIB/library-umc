# ========================================
# STAGE 1: Build TypeScript → dist/
# ========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files first (cache layer)
COPY package*.json ./

# Install ALL deps (termasuk dev) untuk keperluan build TypeScript
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript ke dist/
RUN npm run build

# ========================================
# STAGE 2: Production Image (kecil & bersih)
# ========================================
FROM node:20-alpine AS production
WORKDIR /app

# Set environment ke production
ENV NODE_ENV=production

# Copy dependency files
COPY package*.json ./

# Install HANYA production dependencies (tanpa devDeps)
RUN npm install --omit=dev

# Copy hasil build dari stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Expose port aplikasi
# Cloud Run akan override PORT env var ke 8080 secara otomatis
EXPOSE 4000

# Jalankan langsung dengan node (lebih cepat & stabil)
CMD ["node", "dist/index.js"]
