FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
WORKDIR /app
COPY --chown=node:node package.json index.html ./
COPY --chown=node:node server ./server
COPY --chown=node:node src ./src
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
