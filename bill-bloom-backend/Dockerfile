# .env is NEVER copied into the image.
# Secrets are injected at runtime via docker-compose env_file.

# Stage 1: install production dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: lean runtime image
FROM node:20-alpine

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Do NOT copy .env — it is mounted at runtime

EXPOSE 5000

CMD ["node", "server.js"]
