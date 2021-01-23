<h1 align="center" style="border-bottom: none;">Middleman Proxy</h1>

This is a reverse proxy supporting **HTTP**, **HTTPS**, **SQL**, **MongDB**, **Redis**,  gRPC**, and other request/response protocols.  The protocol messages are recorded by the browser UI using a layout similar
to the Kibana Dev Tools.

Implementation:
- **HTTP proxy** - The node *http* and https packages are used to proxy HTTP and HTTPS messages.
- **TCP proxy** - The node *net* package is used to listen on the specified TCP port, and route the protocol messages to the target TCP port.
- **Socket.IO** - The node *socket.io* package is used to pass messages between the server and browser.

## Quick Setup

### Install packages
```sh
$ cd ~/git/middleman-procy
middleman-proxy$ npm install
```

#### Help
```sh
middleman-proxy$ app.js --help

Usage: npm start [--listen [host:]port] [--listenHttps [host:]port]

Options:
	--listen - listen for incoming http connections.  Default is 8888.
	--listenHttps - listen for incoming https connections.

Example: npm start --listen localhost:3000 --listenHttps 3001

```

### Start server

   ```sh
   middleman-proxy$ npm start    

> middleman@1.0.0 start /home/user/middleman-proxy
> node app.js

Listening on http:  8888
Open browser to http://localhost:8888/middleman
   ```
### Open Dashboard in Browser

Enter http://localhost:8888/middleman in browser:

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-launch.png)

Click the *Settings* in the upper right corner to configure the proxy:

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-settings.png)

1. Select a protocol: http, https, grpc, mongodb, sql, rdis or other.
2. Enter a path for http/https, or a port number for non http/https protocols.
3. Enter a target host (e.g., localhost:80).
4. Click **Add**.
5. Click **Save**.

## Resending HTTP Requests

Recorded HTTP and HTTPS requests can be modified and resent.  Click on the *paper plane* icon for to select a request to resend.  A modal will open to allow the request to be optionally modified, and resent.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-proxy-resend.png)

## Examples
Some simple examples are illustrated:
* [Record iTunes API Messages](#record-itunes-api-messages)
* [Record MySQL Messages](#record-mysql-messages)

### Record iTunes API Messages
This is a simple example illustrating how HTTPS messages can be recorded.   A very simple app that uses the Apple iTunes API to find albums by author is used.

Start the middleman proxy server:
```sh
$ cd middleman-proxy
middleman-proxy$ npm start
```
Open browser to http://localhost:8888

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-launch.png)

Add route for protocol=*https*, path=*/search*, and host=*itunes.apple.com*.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-settings.png)

Click **Add**, and **Save* the configuration.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-save.png)

Clone and install a simple iTunes app:

```sh
$ git clone git@github.com:davechri/itunes.git
$ cd itunes
itunes$ npm install 
```
Configure iTunes app to proxy iTunes API requests thru the middleman proxy:
```sh
itunes$ echo 'ITUNES_URL=http://localhost:8888' > .env
```

Start iTunes app:
```sh
npm run start:dev
```
The iTunes app will open in a Chrome browser tab http://localhost:3000.

Enter an artist and press enter:
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-search.png)

View recorded HTTP messsage in Middleman dashboard.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-dashboard.png)


### Record MySQL Messages
To be completed...

## License

  This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).