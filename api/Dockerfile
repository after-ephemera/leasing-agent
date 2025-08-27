FROM node:20-alpine

WORKDIR /app

# Install OS deps for sqlite3 build
RUN apk add --no-cache python3 make g++ bash

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# Expose dev port
EXPOSE 3001

CMD ["npm", "run", "dev"]


