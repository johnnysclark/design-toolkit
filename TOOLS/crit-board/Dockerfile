# crit-board — studio crit board. Self-hosted, persistent.
FROM node:20-slim

# better-sqlite3 ships a prebuilt binary for node:20-slim (Debian/glibc), so no
# compiler is needed. If a prebuild is ever unavailable for your platform and the
# install falls back to compiling, uncomment the build toolchain below:
# RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
#   && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production deps against the lockfile first (better build-layer caching).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App source (node_modules, data/, .env are excluded via .dockerignore).
COPY . .

ENV NODE_ENV=production
ENV DATA_DIR=/data

# The app listens on $PORT (default 3000). EXPOSE is documentation only — hosts
# inject their own PORT. A persistent disk MUST be mounted at /data (see README).
EXPOSE 3000

CMD ["node", "server.js"]
