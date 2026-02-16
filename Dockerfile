# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install system dependencies: ffmpeg, python3, yt-dlp
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get remove -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create data and download directories
RUN mkdir -p /app/data /app/downloads

EXPOSE 3000

CMD ["node", "server.js"]
