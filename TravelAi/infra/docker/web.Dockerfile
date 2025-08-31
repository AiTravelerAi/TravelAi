# Web Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --workspace=apps/web
CMD ["npm", "run", "dev", "--workspace=apps/web"]
