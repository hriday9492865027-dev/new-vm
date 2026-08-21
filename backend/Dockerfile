# Vignan Mastery Backend Service
FROM node:20-alpine

WORKDIR /usr/src/app

# Install docker CLI inside backend container if Docker-outside-of-Docker is used
RUN apk add --no-cache docker-cli

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
