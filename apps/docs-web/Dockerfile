FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configs
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/docs-web/package.json ./apps/docs-web/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm install

# Copy source trees
COPY packages/shared ./packages/shared
COPY apps/docs-web ./apps/docs-web

# Build shared library
RUN npm run build:shared

# Build Next.js application
WORKDIR /app/apps/docs-web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app /app

WORKDIR /app/apps/docs-web

EXPOSE 3000

CMD ["npm", "run", "start"]
