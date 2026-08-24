# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app
ENV NODE_ENV=development

RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./
RUN npm ci --include=dev

COPY src ./src
COPY public ./public
RUN npm run build

# Production Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Persist data directory
RUN mkdir -p /app/data
VOLUME /app/data

EXPOSE 3000

CMD ["node", "dist/server.js"]
