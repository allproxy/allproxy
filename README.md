<h1 align="center" style="border-bottom: none;">AllProxy: HTTP MITM Debugging Proxy</h1>

MITM debugging proxy with a web GUI to view and modify all of the HTTP and HTTPS (SSL) traffic between your machine and the Internet.  Also supports reverse proxy protocols: HTTP, HTTPS, MongoDB, Redis, MySQL and gRPC.

Also imports JSON logs to make them human readable.

![image](https://img.shields.io/badge/mac%20os-000000?style=for-the-badge&logo=apple&logoColor=white)
![image](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![image](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)

![Alt text](image-2.png)

![Alt text](image-1.png)

### Try AllProxy Online

To try a `readonly` demo:
* Click [Try AllProxy](https://allproxy.ddns.net/allproxy)
* On the left side panel click the `Restore Session` button
* From the Restore Session Modal click `Restore` to restore a sample session

### Install

> Options:
> 1. Install NPM package: `npm install -g allproxy`
>    * Run: `allproxy` or `allproxy_win.bat`
> 2. Clone repo and run: **npm install && npm run build && npm start**
> 3. Docker container:
>    * docker build -t allproxy .
>    * docker run --name allproxy -i -t -v ~/.allproxy:/root/.allproxy —expose 8888 -p 9999:8888  allproxy

> Open `allproxy` in browser;
>    * [localhost:8888/allproxy](http://localhost:8888/allproxy)
---
**NOTE**:
It is recommended that `Use hardware acceleration when available` is disabled on Chrome.
---

### Electron Application

See the [Releases](https://github.com/allproxy/allproxy/releases) to download an Electron Applications for MacOS, Linux and Windows.

### JSON Log Viewer

JSON structured logs can be viewed in a human readable format.  See [jlogviewer](https://github.com/allproxy/jlogviewer) for more details.

### Reverse Proxy Support
Resource proxy protocols include: MongoDb, Redis, MySQL, qGRPC, HTTP, HTTPS and TCP.

![image](https://img.shields.io/badge/HTML-239120?style=for-the-badge&logo=html5&logoColor=white)
![image](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![image](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![image](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![image](https://img.shields.io/badge/redis-%23DD0031.svg?&style=for-the-badge&logo=redis&logoColor=white)

## License

This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).

![image](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![image](	https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![image](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
