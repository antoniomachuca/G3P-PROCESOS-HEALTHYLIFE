FROM node:22-alpine

WORKDIR /app/apps/api
COPY apps/api ./
COPY data /app/data

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/http/server.ts"]

