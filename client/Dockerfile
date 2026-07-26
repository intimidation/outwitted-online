# Dockerfile for @outwitters/client (Nginx static web server)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/

RUN npm install

COPY shared/ ./shared/
COPY client/ ./client/

RUN npm --workspace=shared run build

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm --workspace=client run build

FROM nginx:alpine AS runner

COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
