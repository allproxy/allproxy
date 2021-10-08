FROM node:alpine
WORKDIR '/app'
COPY --from=library/docker:latest /usr/local/bin/docker /usr/bin/docker
COPY --from=docker/compose:latest /usr/local/bin/docker-compose /usr/bin/docker-compose
RUN apk add --no-cache tcpdump
RUN apk add --no-cache curl
RUN apk add --no-cache nghttp2