FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port (Koyeb automatically detects PORT env)
EXPOSE 8080
ENV PORT=8080

# Start Koyeb WebSocket Server
CMD ["npx", "tsx", "server/wsServer.ts"]
