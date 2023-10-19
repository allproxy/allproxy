<h1 align="center" style="border-bottom: none;">AllProxy: HTTP MITM Debugging Proxy</h1>

MITM debugging proxy with a web GUI to view and modify all of the HTTP and HTTPS (SSL) traffic between your machine and the Internet.  Also supports reverse proxy protocols: HTTP, HTTPS, MongoDB, Redis, MySQL and gRPC.

![image](https://img.shields.io/badge/mac%20os-000000?style=for-the-badge&logo=apple&logoColor=white)
![image](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![image](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)

### Install

> Mac: **[allproxy.dmg](https://github.com/allproxy/allproxy/releases/download/v3.32.0/allproxy-3.32.5-x64.dmg)**

> RedHat: **[allproxy.rpm](https://github.com/allproxy/allproxy/releases/download/v3.32.0/allproxy-3.32.5-1.x86_64.rpm)**

> Ubuntu: **[allproxy.deb](https://github.com/allproxy/allproxy/releases/download/v3.32.0/allproxy_3.32.5_amd64.deb)**

> Windows: **[Setup.exe](https://github.com/allproxy/allproxy/releases/download/v3.32.0/allproxy-3.32.5.Setup.exe)**

> Other install options:
> 1. Install NPM package: `npm install -g allproxy`
>    * Run: `allproxy` or `allproxy_win.bat`
>    * [localhost:8888/allproxy](http://localhost:8888/allproxy) in browser
> 2. Clone repo and run: **npm install && npm run build && npm start**
> 3. Clone repo and run headless: **npm install && npm run build && npm run headless**
>    * http://localhost:8888/allproxy in browser
> 3. Docker container:
>    * docker build -t allproxy .
>    * docker run --name allproxy -i -t -v ~/.allproxy:/root/.allproxy —expose 8888 -p 9999:8888  allproxy
>    * http://localhost:8888/allproxy in browser

![Alt text](image-2.png)

![Alt text](image-1.png)

Supported reverse proxy protocols:
![Alt text](image.png)

![image](https://img.shields.io/badge/HTML-239120?style=for-the-badge&logo=html5&logoColor=white)
![image](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![image](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![image](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![image](https://img.shields.io/badge/redis-%23DD0031.svg?&style=for-the-badge&logo=redis&logoColor=white)

## License

This code is licensed under the [MIT License](https://opensource.org/licenses/MIT).

![image](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![image](	https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![image](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
