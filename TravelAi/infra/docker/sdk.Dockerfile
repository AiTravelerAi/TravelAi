# SDK Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --workspace=packages/sdk
CMD ["npm", "run", "build", "--workspace=packages/sdk"]
