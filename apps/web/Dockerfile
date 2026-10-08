FROM node:22-alpine AS build
WORKDIR /app/apps/web
COPY apps/web/package.json ./
RUN npm install
COPY apps/web ./
RUN npm run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
