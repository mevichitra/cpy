FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
