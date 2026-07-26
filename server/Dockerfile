# Dockerfile for @outwitters/server
FROM node:20-alpine AS build

WORKDIR /app

# Copy root and package.jsons for workspace resolution
COPY package.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY server/ ./server/

# Build shared engine and server
RUN npm --workspace=shared run build
RUN npm --workspace=server run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

RUN npm install --omit=dev

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist

EXPOSE 3001

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

CMD ["node", "server/dist/index.js"]
