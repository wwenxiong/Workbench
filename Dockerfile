# Stage 1: Build frontend and install dependencies
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ gcc && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Remove development dependencies to keep image lean
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM node:20-slim AS runner

WORKDIR /app

# better-sqlite3 native addon runtime requirement
RUN apt-get update && apt-get install -y python3 make g++ gcc && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# Ensure persistent directories exist
RUN mkdir -p /app/server/data /app/server/uploads/avatars

# Persist data & uploads
VOLUME ["/app/server/data", "/app/server/uploads"]

EXPOSE 3001

CMD ["node", "server/index.js"]
