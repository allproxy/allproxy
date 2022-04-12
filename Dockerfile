FROM node:alpine
WORKDIR '/app'
#COPY --from=library/docker:latest /usr/local/bin/docker /usr/bin/docker
#COPY --from=docker/compose:latest /usr/local/bin/docker-compose /usr/bin/docker-compose
RUN apk add --no-cache tcpdump
RUN apk add --no-cache curl
RUN apk add --no-cache nghttp2

RUN curl -L https://dl.k8s.io/v1.10.6/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl

EXPOSE 8888
COPY . /app/
RUN npm install 
CMD ["yarn", "start", "--listen", "8888"]
