# ---- Stage 1: Build ----
FROM oven/bun:1.2 AS builder

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

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

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]
