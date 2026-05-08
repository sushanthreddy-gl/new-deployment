# Stage 1: Build / install dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime image
FROM node:20-alpine

WORKDIR /app

# Copy installed modules and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
