FROM oven/bun:1.2 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2 AS runner
WORKDIR /app
RUN mkdir -p uploads

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
