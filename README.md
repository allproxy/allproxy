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
Then, open your browser to http://localhost:8888/middleman

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-launch.png)

Add route for protocol=*https*, path=*/search*, and host=*itunes.apple.com*.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-settings.png)

After clicking **Add**, the new iTunes route is added to the settings.  You then need to click **Save** to save the iTunes route and send the updated configuration to the Middleman server.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-save.png)

Now we clone and install the example iTunes app:

```sh
$ git clone git@github.com:davechri/itunes.git

# Install server
$ cd itunes
itunes$ npm install

# Install client
itunes$ cd client
itunes/client$ npm install
```
The example iTunes app uses the http://itunes.apple.com/search API to search for albums.  We want to record all the iTunes API request/response messages sent by the example iTunes app.  The example iTunes app uses a *.env* file to configure the iTunes URL endpoint.  Normally, it would be set the URL to http://itunes.apple.com, but we need to route the API messages through the Middleman proxy, so we set the ITUNES_URL environment variable to point at the Middleman proxy.  
```sh
# Make sure the current directory is iTunes app root directory
itunes$ echo 'ITUNES_URL=http://localhost:8888' > .env
```

We are now ready to start up the iTunes app.  The app is started in development mode so that it will automatically open a browser tab in a Chrome browser with URL http://localhost:3000.
```sh
# Start the server and client from iTunes app root directory
itunes$ npm run start:dev
```

After the iTunes app has loaded in your Chrome browser, type an artist name (e.g., John Denver), and press enter to start search for albums produced by the artist.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-search.png)

Go to the Middleman dashboard you opened earlier, and click on the HTTPS iTunes endpoint request on the left side of the dashboard, and the response will render on the right side.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-itunes-dashboard.png)

### Recording MySQL Messages
This is an example illustrating how MySQL messages can be recorded.  The DBeaver (Linux) or Sequel Pro SQL Tools (MacOS) can be used to send an SQL query to the MySQL server via the Middleman proxy. In a more realistic development setup, a backend service would send the SQL query, but since I don't have a non-production service to use for this example, I'm just using an SQL Tool.

First we need to start the middleman proxy server.    
```sh
$ cd middleman-proxy
middleman-proxy$ npm start
```
Then open your browser to http://localhost:8888/middleman

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-launch.png)

Add route for protocol=*sql*, port=*33306*, and host=*localhost:3306*.  The Middleman proxy will listen for incoming TCP connections on port 33306, and proxy SQL requests to the MySQL server listening on port 3306.   In this example, we will be running the MySQL server locally on port 3306.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-mysql-settings.png)

After clicking **Add**, the new MySQL route is added to the settings.  You then need to click **Save** to save the MySQL route and send the updated configuration to the Middleman server.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-mysql-save.png)

Now we need to start the SQL Tool (e.g., DBeaver) and create a DB connection to the Middleman proxy listening on port 33306.  The SQL Tool will connect to localhost:33306, and all SQL requests and responses will be recorded by the Middleman proxy.  

I have created a [sample MySQL employees database](https://dev.mysql.com/doc/employee/en/employees-installation.html).   The following query will be sent by the SQL Tool to the Middleman proxy listening on port 33306.
```sql
SELECT * FROM employees
```

Go to the Middleman dashboard you opened earlier, and click on the recorded SQL query on the left side of the dashboard, and the SQL response will render on the right side.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-mysql-dashboard.png)

## Features
The Middleman proxy provides a number of features that help you analysis protcol messages.

These features will be discussed:
* [Filtering Protocol Messages](#filtering-protocol-messages)
* [Freezing Recording](#freezing-recording)
* [Multiple Dashboards](#multiple-dashboards)

### Filtering Protocol Messages
Filtering is a powerful feature that allows you to find protocol messages matching your search filter, and hide unmatched protocol messages.  The entire protocol message is search for a match.  The filter may be *case insensitive*, *case sensitive*, or a *regular expression*.

Types of filters:
* **case insensitive** - If the filter only contains lower case characters, a *case insensitive* match is performed. 
* **case ensensitive** - If the filter contains upper and lower case characters, a *case insensitive* match is performed.
* **regular expression** - If the filter includes ".*", a *regular express* match is performed.

Here is an example of unfiltered protocol messages.  No data is intentionally shown on the left, since it may contain private data.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-unfiltered.png)

Typing into the input filter only shows the protocol message that match the typed filter.  In this case, only those protocol messages that contain the word "google" (case insensitive) are considered matches.
![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-filtered.png)

Filtering by protocol message type is also possible, by simply uncheck a *Recording* checkbox in the *Settings* modal.  The unchecked route will instantly filter the associated protocol messages from the Dashboard.  However, subsequent protocol messages that arrive when the  associated *Recording* checkbox is unchecked will not be recorded.  This is an easy way to filter out protocol messages you may not be interested in seeing, and then uncheck *Recording* checkbox when you want to see those protocol messages again.  In the screenshot below, the *MongoDB* and *Redis* protocol message are unchecked and will not be shown in the Dashboard.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-uncheck-recording.png)

### Freezing Recording
The recording of protocol messages can be temporarily stopped, to allow time to examine the protocol messages without the log wrapping, and overlaying relevant protocol messages.  A typical approach is to recreate a problem by executing a specific function of the app being debugged, and than checking the *Freeze* checkbox to freeze the recording while the log is examined, as shown in this screenshot.

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-freeze.png)

### Multiple Dashboards
Multiple Dashboard instances can be opened in separate browser tabs, and all of the open Dashboards will record protocol messages.  Recording the same protocol messages in separate Dashboard instances is of little value.

However, it can be useful to *Freeze* the recording in one Dashboard instance to keep a snapshot of protocol messages, and then go to another Dashboard instance and *Clear* the log, and then wait for additional protocol messages to be recorded, and again *Freeze* the recording.  In this way multiple different snapshots can be be recorded in different Dashboard instances.  After recording multiple snapshots, the snapshots can be analyzed in each of the Dashboard instances as required.

Each Dashboard instance keeps its own copy of the protocol messages, so clearing or freezing recording in one Dashboard instance, does not affect another other Dashboard instances.

## Certificates for HTTPS Connections 
The Middleman proxy can be started with one or more HTTPS servers that listen for incoming HTTPS connections.  The --listenHttps option is used to start and HTTPS server.  The following start command will start an HTTPS server on port 9999.

```sh
middleman-proxy$ npm start --listenHttps 9999
```

An HTTPS server is started with a private key and public certificate.  The Middleman proxy repo includes a self-signed certificate and private key that will be used by default for TLS authentication.  Since it is self-signed it will not be trusted by your browser, and your browser will warn you that "Your connection is not private". Most browsers will than allow you to proceed to connect to the un-trusted server.

If your security policy does not allow the use of self-signed certificates, you can replace the self-signed certificate and private key with your own CA signed certificate and private key.  Just copy your CA signed certificate and private key to the *server.crt* and *server.key* files, respectively.  The *server.crt* and *server.key* files are located in the *private/keys* directory as shown below.

```sh
middleman-proxy$
private
└── keys
    ├── server.crt
    └── server.key
```

## License

  This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).