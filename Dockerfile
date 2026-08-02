# Dockerfile for Personal Vibe Code & AI Command Center Web UI
FROM node:20-alpine AS base

# Step 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Step 2: Rebuild source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN npm run build

# Step 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install video processing tools
# Note: openai-whisper requires PyTorch (too heavy for Alpine)
# Use faster-whisper (CTranslate2 backend) — lighter, no PyTorch needed
RUN apk add --no-cache \
    bash \
    ffmpeg \
    python3 \
    py3-pip \
    py3-setuptools \
    py3-numpy \
    && pip3 install --no-cache-dir --break-system-packages \
    faster-whisper \
    requests \
    && rm -rf /root/.cache /tmp/pip-*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs


COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/workspace ./workspace
COPY --from=builder --chown=nextjs:nodejs /app/.agents ./.agents
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure data and workspace directories have full write permissions
RUN mkdir -p /app/data /app/workspace && chmod -R 777 /app/workspace /app/data

USER root

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
