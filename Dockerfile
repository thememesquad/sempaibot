FROM node:8-alpine

RUN npm install -g typescript && npm cache clean

VOLUME /app
WORKDIR /app

COPY src src
COPY tsconfig.json tsconfig.json
COPY package.json package.json
COPY LICENSE LICENSE

ENTRYPOINT npm install && tsc -p . --outDir build && npm start