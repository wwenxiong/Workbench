FROM node:22-slim

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ gcc && rm -rf /var/lib/apt/lists/*

# Install dependencies (better-sqlite3 v13 requires Node >= 22)
COPY package*.json ./
RUN npm install

# Copy source code and build frontend dist
COPY . .
RUN npm run build

# Runtime environment settings
ENV NODE_ENV=production
ENV PORT=3001

# Ensure persistent directories exist
RUN mkdir -p /app/server/data /app/server/uploads/avatars

# Persist data & uploads
VOLUME ["/app/server/data", "/app/server/uploads"]

EXPOSE 3001

CMD ["node", "server/index.js"]
