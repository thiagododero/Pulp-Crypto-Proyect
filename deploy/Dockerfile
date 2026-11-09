# Version family intentionally visible; pin a reviewed digest before production.
FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=4173 PULP_DATA_DIR=/data
WORKDIR /app
RUN mkdir -p /data && chown node:node /data /app
COPY --chown=node:node server.mjs package.json ./
COPY --chown=node:node server/ server/
COPY --chown=node:node shared/ shared/
COPY --chown=node:node public/ public/
USER node
EXPOSE 4173
CMD ["node", "server.mjs"]
