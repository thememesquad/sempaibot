FROM node:8-alpine

RUN npm install -g typescript

WORKDIR /app

COPY src src
COPY tsconfig.json tsconfig.json
COPY package.json package.json
COPY config.d.ts config.d.ts
COPY LICENSE LICENSE
COPY Docker/exec.sh exec.sh
COPY yarn.lock yarn.lock

RUN apk add --update build-base libtool autoconf automake python git
RUN yarn install && tsc -p .

ENTRYPOINT /app/exec.sh
