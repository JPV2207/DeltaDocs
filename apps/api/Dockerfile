FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace and lockfiles
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/docs-web/package.json ./apps/docs-web/

# Install dependencies
RUN npm install

# Copy source trees
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared library
RUN npm run build:shared

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build NestJS API
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built artifacts and node_modules
COPY --from=builder /app /app

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
