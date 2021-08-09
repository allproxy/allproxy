<h1 align="center" style="border-bottom: none;">Middleman Proxy</h1>

This debug proxy captures browser HTTP/HTTPS, SQL, gRPC, MongoDB, Redis, log messages, and TCP request/response messages, and integrates them into an easy to use dashboard.  The dashboard shows each captured request message, and its formatted response message.

**Features:**
* captures HTTP and/or HTTPS messages as either a forward or reverse proxy
* captures SQL, MongoDB, Redis, gRPC, and other protocol messages sent to backend services
* captures log messages from dockers logs
* modify and resend HTTP requests
* search entire request/response message for matching text
* stop/start recording
* supports multiple dashboard browser tabs

Implementation:
- **HTTP proxy** - The *http* package is used to proxy HTTP trafic as either a forward or reverse proxy.
- **HTTPS proxy** - The *node-http-mitm-proxy* package is used to build certificates to capture decrypted HTTPS traffic as either a forward or reverse proxy.
- **TCP proxy** - The *net* package is used to listen on a TCP port for non-HTTP messages, and proxy the protocol messages to the target host.
- **Socket.IO** - The node *socket.io* package is used to pass messages between the server and browser where they are recorded and displayed in a dashboard.
- **stdout/stderr** - Spawn a child process to read *stdout* and *stderr* from any docker log or log file, and display the log messages in the dashboard.

### Table of Contents

* [Quick Start](#quick-start)
  * [Install MiddlemanProxy](#install-middleman-proxy)
  * [Build MiddlemanProxy](#build-middleman-proxy)
  * [Start the Middleman Proxy](#start-the-middleman-proxy)
  * [Open Dashboard in Browser](#open-dashboard-in-browser)
  * [Configure Browser Proxy](#configure-browser-proxy)
* [Screenshots](#screenshots)
* [Configuration](#configuration)
  * [HTTP/HTTPS Proxy](http-https-proxy)
  * [MySQL Proxy](#mysql-proxy)
  * [gRPC Proxy](#grpc-Proxy)
  * [MongoDB Proxy](#mongodb-proxy)
  * [Redis Proxy](#redis-proxy)
  * [TCP Proxy](tcp-proxy)
  * [Docker Logs](#docker-logs)
* [Dashboard](#dashboard)
  * [Pause Recording](#pause-recording)
  * [Filter Messages](#filter-messages)
  * [Resend HTTP Requests](#resend-http-requests)
  * [Multiple Browser Tabs](#multiple-browser-tabs)
* [Certificates](#certificates)

## Quick Start

### Install Middleman Proxy
```sh
$ cd ~/git/middleman-proxy
middleman-proxy$ npm install
```

### Build Middleman Proxy
```sh
middleman-proxy$ npm run build
```

#### Middleman Proxy Parameters
```sh
Usage: npm start [--listen [host:]port] [--listenHttps [host:]port]

Options:
	--listen - listen for incoming http connections.  Default is 8888.
	--listenHttps - listen for incoming https connections.

Example: npm start -- --listen 8888 --listenHttps 9999
```

### Start the Middleman Proxy

   ```sh
   middleman-proxy$ npm start

    > middleman@1.0.0 start /home/davechri/middleman-proxy
    > if ./scripts/noDir.sh ./build; then npm run build; fi; if ./scripts/noDir.sh ./client/build; then npm run build-client; fi; NODE_ENV=production node ./build/app.js

    Listening on http:  8888
    Open browser to http://localhost:8888/middleman

    Listening on https:  9999
   ```
### Open Dashboard in Browser

Enter http://localhost:8888/middleman in browser.

### Configure Browser Proxy

To capture HTTP and HTTPS messages, configure your browser to proxy HTTP/HTTPS messages to the Middleman proxy.  The default is to proxy HTTP messages to port 8888, and HTTPS messages to port 9999.  This is how Firefox can be configured to proxy HTTP and HTTPS messages.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/firefox-proxy.png)

for chrome and chromium you can set the browser proxy using environment variables http_proxy and https_proxy.
```sh
$ http_proxy=http://localhost:8888 https_proxy://9999 chromium-browser
```
## Screenshots
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/dashboard.png)
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/settings.png)
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/reachable.png)

## Configuration

This section gives example on how to configure the Middleman proxy.  Clicking the settings icon in the upper right corner opens the Setting modal.

<h3 id="http-https-proxy">HTTP/HTTPS Proxy</h3>

Both a forward and reverse proxy is supported for HTTP/HTTPS messages.  Your browser must be configured to proxy HTTP/HTTPS messages to the Middleman forward proxy.  See [Configure Browser Proxy](#configure-browser-proxy) for more information on configuring your browser.

The Middleman reverse proxy can be used to transparently capture HTTP/HTTPS messages sent by backend services.  The backend service is configured to send the HTTP/HTTPS messages to the Middleman proxy.  For example, a -search- microservice could be configured to send Elasticsearch messages to the Middleman proxy by setting environment variables.

Example -search- microservice configuration:
```sh
ELASTIC_HOST=elasticsearch
ELASTIC_PORT=9200
```

Modified -search- micorservice configuration:
```sh
ELASTIC_HOST=middleman  # middleman is the docker container host name
ELASTIC_PORT=8888       # middleman HTTP port is 8888.  Use 9999 for HTTPS.
```

An HTTP path is added to proxy HTTP requests to the elasticsearch host.  All HTTP requests matching path /_search are proxied to the elasticsearch host on port 9200.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/elasticsearch-settings.png)

### MySQL Proxy
The Middleman SQL proxy can transparently capture SQL messages sent by backend microservices to a MySQL server.

Example microservice config file:
```sh
MYSQL_HOST=mysql
MYSQL_PORT=3306
```

Modified microservice config file:
```sh
MYSQL_HOST=middleman    # Proxy queries to the Middleman proxy
MYSQL_PORT=3306
```

The Middleman proxy is configured to proxy MySQL requests to the MySQL server:
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/mysql-settings.png)

### gRPC Proxy
The Middleman gRPC proxy can transparently capture gRPC messages sent to backend microservices.

Example gRPC microservice config file:
```sh
GRPC_HOST=grpchost    # gRPC host name
GRPC_PORT=12345       # gRPC port number
```

Modified gRPC microservice config file:
```sh
GRPC_HOST=middleman    # Proxy gRPC requests to the Middleman proxy
GRPC_PORT=12345
```

The Middleman proxy is configured to proxy gRPC requests to a microservice:
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/grpc-settings.png)

### MongoDB Proxy
The Middleman MongoDB proxy can transparently capture MongoDB messages sent by backend microservices.

Example MongoDB microservice config file:
```sh
MONGO_HOST=mongodb     # MongoDB host name
MONGO_PORT=27017       # MongoDB port number
```

Modified MongoDB microservice config file:
```sh
MONGO_HOST=middleman    # Proxy MongoDB requests to the Middleman proxy
MONGO_PORT=27017
```

The Middleman proxy is configured to proxy MongoDB requests to a microservice:
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/mongodb-settings.png)

### Redis Proxy
The Middleman Redis proxy can transparently capture Redis messages sent by backend microservices.

Example Redis microservice config file:
```sh
REDIS_HOST=redis    # Redis host name
REDIS_PORT=6379     # Redis port number
```

Modified Redis microservice config file:
```sh
REDIS_HOST=middleman    # Proxy Redis requests to the Middleman proxy
REDIS_PORT=6379
```

The Middleman proxy is configured to proxy Redis requests to a microservice:
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/redis-settings.png)

### TCP Proxy
The Middleman TCP proxy can transparently capture TCP request/response messages sent by backend microservices.  For example, the TCP proxy can be used to capture memcached messages.

Example Memcached microservice config file:
```sh
MEMCACHED_HOST=memcached    # Memcached host name
MEMCACHED_PORT=11211        # Memcached port number
```

Modified Memcached microservice config file:
```sh
MEMCACHED_HOST=middleman    # Proxy Memcached requests to the Middleman proxy
MEMCACHED_PORT=11211
```

The Middleman proxy is configured to proxy Memcached requests to a microservice:
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/memcached-settings.png)

### Dockers Logs
The Middleman Docker log proxy can capture log messages.

The Middleman proxy is configured to capture Dockers log messages:
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/log-settings.png)

## Dashboard
The Middleman proxy dashboard is stated from the browser with URL http://localhost:8888/middleman.

### Pause Recording
The recording of messages can be temporarily stopped, to allow time to examine the messages without the log wrapping.

### Filter Messages
Filtering allows you to find messages matching a search filter, and hide other messages.  The entire message is search for a match.  The filter may be *case insensitive*, *case sensitive*, or a *regular expression*.

Types of filters:
* **case insensitive** - If the filter only contains lower case characters, a *case insensitive* match is performed.
* **case ensensitive** - If the filter contains upper and lower case characters, a *case insensitive* match is performed.
* **regular expression** - If the filter includes ".*", a *regular express* match is performed.

Boolean filters can use &&, ||, !, and parenthesis.

### Resend HTTP Requests
To resend an HTTP or HTTPS request, click on the icon next to the request to open a modal.  Optionally modify the request body, and then click the send button.  If the dashboard is not paused, the resent request should appear at the bottom of the dashboard request log.

### Multiple Browser Tabs
Multiple Dashboard instances can be opened in separate browser tabs, and all of the open Dashboards will record messages.

Each Dashboard instance keeps its own copy of the messages, so clearing or stopping recording in one Dashboard instance, does not affect another other Dashboard instances.

## Certificates
Certificates are managed by the [node-http-mitm-proxy](https://github.com/joeferner/node-http-mitm-proxy/tree/master/examples) package.

Generated certificates are stored in -middleman-proxy/.http-mitm-proxy/certs-.  The '/middleman-proxy/.http-mitm-proxy/certs/ca.pem' CA certificate can be imported to your browser to trust certificates generated by the Middleman proxy.

## License

This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).