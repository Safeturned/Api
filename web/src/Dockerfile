FROM node:25-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:25-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_VERSION=dev
ARG NEXT_PUBLIC_API_URL=https://api.safeturned.com
ARG NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID=1436734963125981354
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID=${NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID}
RUN echo "Build timestamp: $(date)" && \
    rm -rf .next && \
    npm run build

FROM node:25-alpine AS runner
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://api.safeturned.com
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs

COPY --chown=nextjs:nextjs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nextjs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nextjs --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
