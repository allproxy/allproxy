<h1 align="center" style="border-bottom: none;">Middleman Proxy</h1>
<h3 align="center">The middleman proxy is a development tool that displays the HTTP request/response messsages in the browser, and allows requests to be modified and resent.</h3>

## Setup and configuration

### Start the middleman proxy

   ```
   ~/git/middleman-proxy$ node app.js 
   Listening on port 8888
   ```
### Middleman proxy app

Enter localhost:8888/middleman in browser:

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-proxy.png)

Click the settings icon (wrench) ion the upper right corner to configure proxy routes:

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-proxy-settings.png)

Enter localhost:8888 in browser to launch application.  The Middleman proxy app will capture the HTTP messages:

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-proxy-messages.png)

Resend an HTTP requests:

![ ](https://github.com/davechri/middleman-proxy/blob/master/images/middleman-proxy-resend.png)

## License

  This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).