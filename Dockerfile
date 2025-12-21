# syntax=docker/dockerfile:1

# Build stage - install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Final stage - distroless Node for minimal size (~80-90MB)
FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app

# Copy dependencies and application
COPY --from=deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --chown=nonroot:nonroot package.json ./
COPY --chown=nonroot:nonroot server.js ./
COPY --chown=nonroot:nonroot public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["server.js"]
