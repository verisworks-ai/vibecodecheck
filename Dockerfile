FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY bin ./bin
COPY mcp ./mcp
COPY src ./src
COPY README.md ./

EXPOSE 3000

CMD ["node", "mcp/server.js"]
