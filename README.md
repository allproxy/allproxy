<h1 align="center" style="border-bottom: none;">AllProxy: MITM HTTP Debugging Tool</h1>

AllProxy is a free HTTP debugging proxy that has a web GUI to view and modify all of the HTTP and HTTPS (SSL) traffic between their machine and the Internet.  It is an open-source alternative to the popular Charles and Fiddler developer tools.

### Install
> Install options:
> 1. Install application package: **[Releases](https://github.com/allproxy/allproxy/releases)**
> 2. Install NPM package: **npm install -g allproxy**
> 3. Clone repo and run: **npm install && npm start**

### Additional Features

Capture MySQL, gRPC, MongoDB, Redis, Memcached, TCP, and log messages.

![npm](https://img.shields.io/npm/v/allproxy) ![npm](https://img.shields.io/npm/dm/allproxy)

![image](https://img.shields.io/badge/mac%20os-000000?style=for-the-badge&logo=apple&logoColor=white)
![image](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)

<img width="1187" alt="image" src="https://user-images.githubusercontent.com/10223382/170111493-a6593aa1-8d92-46d7-8b6b-624d0e73d87c.png">

**AllProxy Dashboard**
![image](https://user-images.githubusercontent.com/10223382/169716564-833d926d-b011-4d6c-a108-7bf6e898de4b.png)

**Features:**
* Captures HTTP and/or HTTPS messages as either a forward or reverse proxy
* Captures SQL, MongoDB, Redis, gRPC, and other protocol messages sent to backend services
* Captures log messages from dockers logs
* Modify and resend HTTP requests
* Add breakpoints to modify HTTP responses
* Search entire request/response message for matching text
* Stop/Start Recording
* Take snapshots of captured messages
* Export and Import captured messages
* Supports multiple dashboard browser tabs
* Dark/Light Mode 

![image](https://img.shields.io/badge/HTML-239120?style=for-the-badge&logo=html5&logoColor=white)
![image](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![image](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![image](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![image](https://img.shields.io/badge/redis-%23DD0031.svg?&style=for-the-badge&logo=redis&logoColor=white)

### Table of Contents

* [Quick Start](#quick-start)
  * [Node Version](#node-version)
  * [Install AllProxy](#install-allproxy-proxy)
  * [Start the AllProxy](#start-the-allproxy-proxy)
  * [Install and Trust CA Certificate](#install-and-trust-ca-certificate)
  * [Open Dashboard in Browser](#open-dashboard-in-browser)
  * [Configure Proxy](#configure-proxy)
* [Screenshots](#screenshots)
* [Configuration](#configuration)
  * [HTTP/HTTPS Proxy](#http-https-proxy)
  * [HTTP/2 Support](#http2-support)
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
  * [Breakpoint to Modify HTTPS Responses(#breakepoint-to-modify-https-responses)]
  * [Modify HTTPS JSON Responses](#modify-https-json-responses)
  * [Snapshots](#snapshots)
  * [Multiple Browser Tabs](#multiple-browser-tabs)
* [Certificates](#certificates)
* [Implementation](#imlementation)
* [Limitations](#limitations)

## Quick Start

### Node Version
Version 12 or higher is required.  Use nvm to install the appropriate node version.

### Install AllProxy
The AllProxy may be installed from [Releases](https://github.com/allproxy/allproxy/releases), [NPM](https://www.npmjs.com/package/allproxy), or cloning the repo.

#### Install From NPM
```sh
$ npm install -g allproxy
```

#### Install From GitHub Project
```sh
$ cd ~/git/allproxy
allproxy$ npm install
```

### Start the AllProxy Server
The AllProxy server is started using either the NPM installed **allproxy** script or using npm start, depending on how it was installed.
#### Start NPM Package
  ```sh
  $ allproxy

    Listening on http:  8888
    Open browser to http://localhost:8888/allproxy
  ```

#### Start GitHub Project
   ```sh
   allproxy$ npm start

    Listening on http:  8888
    Open browser to http://localhost:8888/allproxy
   ```
### Install and Trust CA Certificate

After starting AllProxy, run **~/.allproxy/bin/trustCert.sh enable** from your terminal to install and trust the CA certificate.

The **ca.pem** location:
* ~/.allproxy/ca.pem

Some browsers (e.g., Firefox) do not use the system certificate store, and will require the certificate to be imported in to the browser CA certificate store.

### Open Dashboard in Browser

If the allproxy NPM package is installed, you will need to open the dashboard in a browser:
* http://localhost:8888/allproxy in browser.

### Configure Proxy

Run **~/.allproxy/bin/systemProxy.sh enable** from your terminal to configure the system proxy.

Some browser (e.g., Firefox) do not use the system proxy settings, and you will not to configure the browser proxy settings to:
* host: localhost
* port: 8888

#### Terminal
To capture http/https messages initiated by terminal commands, set the HTTPS_PROXY and HTTP_PROXY environment variables.
```sh
$ export HTTPS_PROXY=localhost:8888
$ export HTTP_PROXY=localhost:8888
```

To prevent hosts from being proxied to AllProxy, use the NO_PROXY environment variable:
```sh
$ export NO_PROXY=domain1,domain2,...
```

#### Firefox Proxy Configuration
To capture HTTP and HTTPS messages, configure your browser to proxy HTTP/HTTPS messages to the AllProxy.  The default is to proxy both HTTP and HTTPS messages to port 8888.  This is how Firefox can be configured to proxy HTTP and HTTPS messages.
![image](https://user-images.githubusercontent.com/10223382/169716631-b946b6fc-2146-4768-a60d-710b188856a8.png)


#### Linux Proxy Configuration

For chrome and chromium you can set the browser proxy using environment variables http_proxy and https_proxy.
```sh
$ HTTP_PROXY=http://localhost:8888 HTTPS_PROXY://8888 chromium-browser
```

## Screenshots
### Dashboard
![image](https://user-images.githubusercontent.com/10223382/169716662-5b42e911-d157-47e7-8087-322a7945592b.png)


### Settings
![image](https://user-images.githubusercontent.com/10223382/169716681-8ff7a55b-5ae1-422d-a840-7c18eaa1955d.png)

### Reachable Hosts
![image](https://user-images.githubusercontent.com/10223382/169716698-65cd561d-ff6d-4b1a-8299-dac307883505.png)

## Configuration

This section gives example on how to configure the AllProxy.  Clicking the settings icon in the upper right corner opens the Setting modal.

<h3 id="http-https-proxy">HTTP/HTTPS Proxy</h3>

Both a forward and reverse proxy is supported for HTTP/HTTPS messages.  Your browser must be configured to proxy HTTP/HTTPS messages to the forward proxy.  See [Configure Browser Proxy](#configure-browser-proxy) for more information on configuring your browser.

The reverse proxy can be used to transparently capture HTTP/HTTPS messages sent by backend services.  The backend service is configured to send the HTTP/HTTPS messages to the AllProxy.  For example, a -search- microservice could be configured to send Elasticsearch messages to the AllProxy by setting environment variables.

Example -search- microservice configuration:
```sh
ELASTIC_HOST=elasticsearch
ELASTIC_PORT=9200
```

Modified -search- micorservice configuration:
```sh
ELASTIC_HOST=allproxy   # allproxy is the docker container host name
ELASTIC_PORT=8888       # allproxy HTTP port is 8888.
```

An HTTP path is added to proxy HTTP requests to the elasticsearch host.  All HTTP requests matching path /_search are proxied to the elasticsearch host on port 9200.
![image](https://user-images.githubusercontent.com/10223382/169716730-32d9107f-337a-4d74-b7e6-3cbc1b04e60d.png)


<h3 id="http2-support">HTTP/2 Support</h3>
You can use HTTP/2 to connect to HTTP/2 enabled servers (e.g., duckduckgo.com).  To enable HTTP/2:
```sh
$ allproxy --http2
```

### MySQL Proxy
The SQL proxy can transparently capture SQL messages sent by backend microservices to a MySQL server.

Example microservice config file:
```sh
MYSQL_HOST=mysql
MYSQL_PORT=3306
```

Modified microservice config file:
```sh
MYSQL_HOST=allproxy    # Proxy queries to the AllProxy
MYSQL_PORT=3306
```

The AllProxy is configured to proxy MySQL requests to the MySQL server:
![image](https://user-images.githubusercontent.com/10223382/169716750-520f9874-2c41-4cd9-87ea-e5d477fe99ef.png)


### gRPC Proxy
The gRPC proxy can transparently capture gRPC HTTP/2 messages sent to backend microservices.  Only unsecure connections are supported.  Secure TLS support may be added in the future.

Example gRPC microservice config file:
```sh
GRPC_HOST=grpchost    # gRPC host name
GRPC_PORT=12345       # gRPC port number
```

Modified gRPC microservice config file:
```sh
GRPC_HOST=allproxy    # Proxy gRPC requests to the AllProxy
GRPC_PORT=12345
```

#### Proto Files
Proto files can be added to the **proto/** directory so that the AllProxy tool can decode the binary data, and make it readable.  AllProxy currently only supports GRPC URLs of the
form **/<package>/<service>.<func>** (e.g., /mypackage/mMService/MyFunc).

The AllProxy is configured to proxy gRPC requests to a microservice:
![image](https://user-images.githubusercontent.com/10223382/169716774-50a36b6a-5503-46af-b119-b718278db0a6.png)


### MongoDB Proxy
The MongoDB proxy can transparently capture MongoDB messages sent by backend microservices.

Example MongoDB microservice config file:
```sh
MONGO_HOST=mongodb     # MongoDB host name
MONGO_PORT=27017       # MongoDB port number
```

Modified MongoDB microservice config file:
```sh
MONGO_HOST=allproxy    # Proxy MongoDB requests to the AllProxy
MONGO_PORT=27017
```

The AllProxy is configured to proxy MongoDB requests to a microservice:
![image](https://user-images.githubusercontent.com/10223382/169716792-91700185-342c-4fad-a0b4-5820fea35bf4.png)

### Redis Proxy
The Redis proxy can transparently capture Redis messages sent by backend microservices.

Example Redis microservice config file:
```sh
REDIS_HOST=redis    # Redis host name
REDIS_PORT=6379     # Redis port number
```

Modified Redis microservice config file:
```sh
REDIS_HOST=allproxy    # Proxy Redis requests to the AllProxy
REDIS_PORT=6379
```

The AllProxy is configured to proxy Redis requests to a microservice:
![image](https://user-images.githubusercontent.com/10223382/169716813-a0474162-b90b-4310-8dad-fcaec1b58d1b.png)

### TCP Proxy
The TCP proxy can transparently capture TCP request/response messages sent by backend microservices.  For example, the TCP proxy can be used to capture memcached messages.

Example Memcached microservice config file:
```sh
MEMCACHED_HOST=memcached    # Memcached host name
MEMCACHED_PORT=11211        # Memcached port number
```

Modified Memcached microservice config file:
```sh
MEMCACHED_HOST=allproxy    # Proxy Memcached requests to the AllProxy
MEMCACHED_PORT=11211
```

The AllProxy is configured to proxy Memcached requests to a microservice:
![image](https://user-images.githubusercontent.com/10223382/169716834-4b186b8a-e2c9-462a-a0a6-e7b4706dd895.png)

### Dockers Logs
The Docker log proxy can capture log messages.

The AllProxy is configured to capture Dockers log messages:
![image](https://user-images.githubusercontent.com/10223382/169716855-37c271ce-1b03-4b68-87e1-cf117630420c.png)

## Dashboard
The AllProxy dashboard is stated from the browser with URL http://localhost:8888/allproxy.

### Pause Recording
The recording of messages can be temporarily stopped, to allow time to examine the messages without the log wrapping.

### Filter Messages
Filtering allows you to find messages matching a search filter, and hide other messages.  The entire message is search for a match.  The filter may be *case insensitive*, *case sensitive*, a *logical expression*, or a *regular expression*.

Types of filters:
* **case insensitive** - If *Aa* is not selected, a case insensitive search is performed.
* **case ensensitive** - If *Aa* is selected, a case sensitive search is performed.
* **logical expression** - If *&&* is selected, &&, ||, (), and ! operators may be used to build a logical expression.
* **regular expression** - If *.** is selected, regular expression match in performed.

Boolean filters can use &&, ||, !, and parenthesis.

### Resend HTTP Requests
To resend an HTTP or HTTPS request, click on the icon next to the request to open a modal.  Optionally modify the request body, and then click the send button.  If the dashboard is not paused, the resent request should appear at the bottom of the dashboard request log.

### Breakpoint to Modify HTTPS Responses
Breakpoints can be set to match any part of the HTTP request or response, and then modify the JSON response then the breakpoint matches.

Click Settings->Breakpoints: <img width="100" alt="breakpoint" src="https://user-images.githubusercontent.com/10223382/169717271-c713fd42-91bf-4606-964a-88cdd6d0666b.png">

In this example a breakpoint is set to match on URL https://us-south-stage01.iaasdev.cloud.ibm.com/v1/vpcs.
![image](https://user-images.githubusercontent.com/10223382/169717656-530504b8-8a95-4e5d-92f2-9f2c9ddef1c3.png)

When a request URL matches https://us-south-stage01.iaasdev.cloud.ibm.com/v1/vpcs, a model pops up to allow the JSON response body to be edited.  The response JSON body can be edited, and Ok clicked to forward the response back to the client.
![image](https://user-images.githubusercontent.com/10223382/169717596-87c5e60f-26de-44fd-a8f3-f8fc1477c27f.png)

### Modify HTTPS JSON Responses
Custom JavaScript code may be provided to modify any JSON response.  Add your custom code to the **InterceptJsonResponse()** function is called for every JSON response, and can be modified to customize the JSON response body.  Edit the **intercept/InterceptResponse.js file as needed.
```sh
$ vi intercept/InterceptResponse.js
````
Example:
```js
module.exports = function InterceptJsonResponse(clientReq, json) {
    const reqUrl = url.parse(clientReq.url);
    const path = reqUrl.pathname;
    const query = reqUrl.query;

    /**
     * Add your code here to modify the JSON response body
     */
    if (path === '/aaa/bbb') {
      json.addMyField = 1;
      return json; // return modified JSON response body
    }

    return null; // do not modify JSON response body
}
```

### Snapshots
Clicking on the camera icon will take a snapshot of the currently captured messages, and create a new snapshot tab.  A snapshot tab may be exported to a file, and later imported again.

### Multiple Browser Tabs
Multiple Dashboard instances can be opened in separate browser tabs, and all of the open Dashboards will record messages.

Each Dashboard instance keeps its own copy of the messages, so clearing or stopping recording in one Dashboard instance, does not affect another other Dashboard instances.

## Certificates
Certificates are managed by the [node-http-mitm-proxy](https://github.com/joeferner/node-http-mitm-proxy/tree/master/examples) package.

Generated certificates are stored in **.allproxy/.http-mitm-proxy/certs/**.  Import **allproxy/ca.pem** to your browser to trust all AllProxy generated certificates.

The **allproxy-ca** script can be used to install the CA certificate on MacOS and Linux.

For Windows, execute the allproxy-ca script to get the path of the CA certificate, and manually import it to your browser.

## Implementation:
- **HTTP proxy** - The *http* package is used to proxy HTTP traffic as either a forward or reverse proxy.
- **HTTPS proxy** - The *node-http-mitm-proxy* package is used to build certificates to capture decrypted HTTPS traffic as either a forward or reverse proxy.
- **TCP proxy** - The *net* package is used to listen on a TCP port for non-HTTP messages, and proxy the protocol messages to the target host.
- **Socket.IO** - The node *socket.io* package is used to pass messages between the server and browser where they are recorded and displayed in a dashboard.
- **stdout/stderr** - Spawn a child process to read *stdout* and *stderr* from any docker log or log file, and display the log messages in the dashboard.

### Configuration File
* When running from a GitHub package, **config.json** file is stored in the root directory of your GitHub project.
* When running from an NPM package (allproxy script), the **config.json** file is stored your home directory at $HOME/.allproxy/config.json.

### Command Line Parameters
```sh
Usage: allproxy [--listen [host:]port] [--listenHttps [host:]port]

Options:
	--listen - listen for incoming http connections.  Default is 8888.
	--listenHttps - listen for incoming https connections.

Example: allproxy --listen 8888
```

## Limitations
1. Only HTTP/2 reverse proxy is supported.  HTTP/2 forward proxy is not supported.

## License

This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).

![image](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![image](	https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![image](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
