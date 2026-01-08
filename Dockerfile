FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY server ./server

EXPOSE 3000

CMD ["node", "server/server.js"]
