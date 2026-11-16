FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "server.js"]