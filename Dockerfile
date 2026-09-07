FROM node:20-slim

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ gcc && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001

# Install dependencies (better-sqlite3 is compiled here in the exact runtime environment)
COPY package*.json ./
RUN npm install

# Copy source and build frontend (dist output)
COPY . .
RUN npm run build

# Ensure persistent directories exist
RUN mkdir -p /app/server/data /app/server/uploads/avatars

# Persist data & uploads
VOLUME ["/app/server/data", "/app/server/uploads"]

EXPOSE 3001

CMD ["node", "server/index.js"]
