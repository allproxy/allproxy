<h1 align="center" style="border-bottom: none;">Middleman Proxy</h1>

This repo implements a reverse proxy supporting **HTTP**, **HTTPS**, **SQL**, **MongDB**, **Redis**,  **gRPC**, and any other request/response protocols.  The protocol messages are recorded by the browser UI using a layout similar to the Kibana Dev Tools.

Implementation:
- **HTTP proxy** - The *http* and https node packages are used to proxy HTTP and HTTPS messages.
- **TCP proxy** - The *net* node package is used to listen a non-HTTP/HTTPS TCP port, and proxy the protocol messages to the target host.
- **Socket.IO** - The node *socket.io* package is used to pass messages between the server and browser where they are recorded and displayed in a dashboard.

## Quick Start

### Install Middleman Proxy
```sh
$ cd ~/git/middleman-proxy
middleman-proxy$ npm install
```

#### Middleman Proxy Parameters
```sh
middleman-proxy$ app.js --help

Usage: npm start [--listen [host:]port] [--listenHttps [host:]port]

Options:
	--listen - listen for incoming http connections.  Default is 8888.
	--listenHttps - listen for incoming https connections.

Example: npm start --listen localhost:3000 --listenHttps 3001

```

### Start the Server

   ```sh
   middleman-proxy$ npm start
   ```
### Open Dashboard in Browser

Enter http://localhost:8888/middleman in browser:

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-launch.png)

Click the *Settings* icon in the upper right corner, and open the Settings modal.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-settings.png)

1. Select a protocol: *http, https, grpc, mongodb, sql, rdis or other*.
2. Enter a path for http/https, or a port number for non http/https protocols.
3. Enter a target host (e.g., localhost:80).
4. Click **Add**.
5. Click **Save**.

## Resending HTTP Requests

Recorded HTTP and HTTPS requests can be modified and resent.  Click on the *paper plane* icon for to select a request to resend.  A modal will open to allow the request to be optionally modified, and resent.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-resend.png)

## Examples
Some simple examples are illustrated to provide step by step details on how to setup and use the Middleman proxy.

These examples are illustrated below:
* [Record HTTPS iTunes API Messages](#record-itunes-api-messages)
* [Record MySQL Messages](#record-mysql-messages)

### Recording HTTPS iTunes API Messages
This is a simple example illustrating how HTTPS messages can be recorded.  A very simple app that uses the Apple iTunes API to find albums by author is used for this example.

First we need to start the middleman proxy server.  By default the server will listen on port 8888 for incoming HTTP connections.  The default is to listen for HTTP connections, however, it is also possible to listen for incoming HTTPS connections.  
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

Now we clone and install the example iTunes app:

```sh
$ git clone git@github.com:davechri/itunes.git
$ cd itunes
itunes$ npm install 
```
The example iTunes app uses the http://itunes.apple.com/search API to search for albums.  We want to record all the iTunes API request/response messages sent by the example iTunes app.  The example iTunes app uses a *.env* file to configure the iTunes URL endpoint.  Normally, it would be set the URL to http://itunes.apple.com, but we need to route the API messages through the Middleman proxy, so we set the ITUNES_URL environment variable to point at the Middleman proxy.  
```sh
itunes$ echo 'ITUNES_URL=http://localhost:8888' > .env
```

We are now ready to start up the iTunes app.  The app is started in development mode so that it will automatically open a browser tab in a Chrome browser with URL http://localhost:3000.
```sh
npm run start:dev
```

After the iTunes app has loaded in your Chrome browser, type an artist name (e.g., John Denver), and press enter to start search for albums produced by the artist.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-search.png)

Go to the Middleman dashboard you opened earlier, and click on the HTTPS iTunes endpoint request, to see its associated response.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-dashboard.png)

### Recording MySQL Messages
To be completed...

## Certificates for HTTPS Connections 
To be completed...


## License

  This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).