# ---- Stage 1: Build ----
FROM oven/bun:1.2 AS builder

WORKDIR /app

# Copy dependency files
COPY package.json bunfig.toml ./

# Install dependencies (lockfile is regenerated to match package.json)
RUN bun install

# Copy source code
COPY . .

# Build the app (outside Lovable sandbox, node-server preset is used)
RUN bun run build

# ---- Stage 2: Run ----
FROM node:22-alpine AS runner

WORKDIR /app

# Copy the built app from Nitro output
COPY --from=builder /app/.output ./.output

# Expose the port Nitro listens on
EXPOSE 3000

# Docker healthcheck against the app's own health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]
