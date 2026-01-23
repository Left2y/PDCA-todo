# Stage 1: Build
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# Set production port
ENV PORT=3000

# Copy necessary files for standalone mode
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create data directory and set permissions
RUN mkdir -p data && chmod 777 data

EXPOSE 3000

# Run with node directly for better performance and stability in standalone mode
CMD ["node", "server.js"]
