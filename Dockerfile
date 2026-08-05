# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
# Prisma a besoin d'openssl (alpine/musl)
RUN apk add --no-cache openssl
WORKDIR /app

# --- Dépendances + build -----------------------------------------------------
FROM base AS builder
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `postinstall` lance `prisma generate`, d'où la copie du schéma au-dessus
RUN npm ci
COPY . .
# DATABASE_URL factice : Next collecte les pages au build, Prisma exige la var
ENV DATABASE_URL="file:/tmp/build.db"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime -----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# La base SQLite vit dans un volume, pas dans l'image
RUN mkdir -p /app/data

EXPOSE 3000
# Applique les migrations avant de démarrer (idempotent)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
