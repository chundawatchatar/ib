# API image. The client deploys separately as a static site.
FROM node:24-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@11.15.1
COPY . .
RUN pnpm install --frozen-lockfile --filter @salary-manager/api... \
	&& pnpm --filter @salary-manager/api run build

# The bundle includes its dependencies, so the runtime needs no node_modules.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=build /repo/apps/api/dist ./
USER node
EXPOSE 3001
CMD ["node", "--enable-source-maps", "index.cjs"]
