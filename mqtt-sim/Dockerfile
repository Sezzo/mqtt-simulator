# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy sources
COPY tsconfig*.json ./
COPY src ./src
COPY config ./config

# Build
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine
WORKDIR /app

# minimal runtime deps
COPY package*.json ./
RUN npm ci --omit=dev

# bring built code + config
COPY --from=build /app/dist ./dist
COPY --from=build /app/config ./config

# default env
ENV PORT=4444 \
    MQTT_URL=mqtt://broker:1883 \
    MQTT_NAMESPACE=sim \
    MQTT_QOS=1 \
    MQTT_RETAINED=true \
    DB_DATABASE=/data/dev.db \
    DB_SYNCHRONIZE=true \
    DISCOVERY_ENABLED=true \
    DEVICE_TEMPLATES_PATH=/app/config/device-templates.yaml \
    NODE_ENV=production

# volumes for db + (optional) custom config
VOLUME ["/data", "/app/config"]

EXPOSE 4444
CMD ["node", "dist/main.js"]
