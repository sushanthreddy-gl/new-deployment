# VITE_API_URL is baked into the JS bundle at build time.
# In production it must be /api so all requests route through Nginx.
# Never copy a .env file into this image.

# Stage 1: build the Vite app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Accept the API base URL as a build argument; default to /api for production.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Stage 2: serve the compiled assets with nginx
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
