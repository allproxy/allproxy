FROM node:16 AS build
COPY . /allproxy
RUN cd allproxy && npm install && npm run install-client && npm run build
RUN cd allproxy && npm prune --production

RUN rm -r allproxy/node_modules/.bin
RUN find /allproxy/node_modules -type d -name "@electron*" -exec rm -r {} \; || echo ""
RUN find /allproxy/node_modules -type d -name "electron*" -exec rm -r {} \; || echo ""
RUN find /allproxy/node_modules -type d -name "doc" -exec rm -r {} \; || echo ""
RUN find /allproxy/node_modules -type d -name "docs" -exec rm -r {} \; || echo ""
RUN find /allproxy/node_modules -type f -name "gulpfile.js" -exec rm {} \; || echo ""
RUN find /allproxy/node_modules -type f -name "karma.conf.js" -exec rm {} \; || echo ""
RUN find /allproxy/node_modules -type f -name "*.eslintrc" -exec rm {} \; || echo ""
RUN find /allproxy/node_modules -type f -name "*.h" -exec rm {} \; || echo ""
RUN find /allproxy/node_modules -type f -name "*.c" -exec rm {} \; || echo ""
RUN find /allproxy/node_modules -type f -name "*.cpp" -exec rm {} \; || echo ""
RUN find /allproxy/node_modules -type f -name "*.ts" -exec rm {} \; || echo ""

FROM node:16-alpine
WORKDIR '/allproxy'

RUN mkdir /allproxy/client
RUN mkdir /allproxy/proto
COPY intercept /allproxy/intercept
COPY package.json /allproxy/package.json
COPY --from=build /allproxy/bin /allproxy/bin
COPY --from=build /allproxy/node_modules /allproxy/node_modules
COPY --from=build /allproxy/build /allproxy/build
COPY --from=build /allproxy/client/build /allproxy/client/build
COPY client/package.json /allproxy/client/package.json
COPY scripts /allproxy/scripts

EXPOSE 8888
CMD ["yarn", "start-headless", "--listen", "8888"]
