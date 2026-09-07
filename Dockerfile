FROM node:20-slim

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ gcc && rm -rf /var/lib/apt/lists/*

# Install all dependencies including devDependencies (typescript, vite) for building frontend
COPY package*.json ./
RUN npm install --include=dev

# Copy source code and build frontend dist
COPY . .
RUN npm run build

# Prune devDependencies to keep final image clean and minimal
RUN npm prune --omit=dev

# Runtime environment settings
ENV NODE_ENV=production
ENV PORT=3001

# Ensure persistent directories exist
RUN mkdir -p /app/server/data /app/server/uploads/avatars

# Persist data & uploads
VOLUME ["/app/server/data", "/app/server/uploads"]

EXPOSE 3001

CMD ["node", "server/index.js"]
