# syntax=docker/dockerfile:1

# Build stage - install deps and build CSS
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tailwind.config.cjs ./
COPY public ./public

# Build CSS + minified JS, then prune dev deps for production runtime
RUN npm run build && npm prune --omit=dev && npm cache clean --force

# Final stage - distroless Node for minimal size (~80-90MB)
FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app

# Copy dependencies and application
COPY --from=deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --chown=nonroot:nonroot package.json ./
COPY --chown=nonroot:nonroot server.js ./
COPY --from=deps --chown=nonroot:nonroot /app/public ./public

# Tailwind config not required at runtime

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["server.js"]
