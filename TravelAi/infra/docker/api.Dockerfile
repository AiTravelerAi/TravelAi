# API Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --workspace=apps/api
CMD ["npm", "run", "start", "--workspace=apps/api"]
