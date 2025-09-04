# Étape 1 : build
FROM node:20-alpine AS builder

WORKDIR /app
COPY . .
RUN npm install --force
RUN npm run build

# Étape 2 : exécution (serveur Next.js)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 8018

CMD ["npm", "start", "--", "-p", "8018"]
