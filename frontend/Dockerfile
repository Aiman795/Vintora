FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_PYTHON_URL=/ai
ARG VITE_TRYON_URL=/tryon
ARG VITE_SOCKET_URL=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PYTHON_URL=$VITE_PYTHON_URL
ENV VITE_TRYON_URL=$VITE_TRYON_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

