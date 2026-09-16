# ---------- deps ----------
FROM node:24-alpine AS deps
WORKDIR /app

# libc6-compat é necessário para algumas dependências nativas em Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
# --ignore-scripts evita o postinstall (prisma skills sync) durante o build
RUN npm ci --ignore-scripts

# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------- runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# usuário não-root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]