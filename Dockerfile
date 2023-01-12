FROM node:16 AS build
COPY . /
RUN npm install && npm run install-client && npm run build

FROM node:16-alpine
WORKDIR '/allproxy'

RUN mkdir /allproxy/client
RUN mkdir /allproxy/proto
COPY intercept /allproxy/intercept
COPY package.json /allproxy/package.json
COPY --from=build bin /allproxy/bin
COPY --from=build node_modules /allproxy/node_modules
COPY --from=build build /allproxy/build
COPY --from=build client/build /allproxy/client/build
COPY client/package.json /allproxy/client/package.json
COPY scripts /allproxy/scripts

EXPOSE 8888
CMD ["yarn", "start-headless", "--listen", "8888"]
