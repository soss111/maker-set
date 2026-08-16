FROM node:22-bookworm-slim

WORKDIR /app

# Native module build tools (sqlite3, bcrypt, sharp)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . ./

RUN mkdir -p database uploads logs data

ENV NODE_ENV=production
ENV PORT=5001
ENV DB_FILE=/app/data/makerset.db

EXPOSE 5001

CMD ["node", "index.js"]
