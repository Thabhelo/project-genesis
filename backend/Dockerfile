FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Don't include .env or serviceAccountKey.json in image - use Cloud Run env/secrets
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "index.js"]
