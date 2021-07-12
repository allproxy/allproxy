# To generate a key and certificate run:
* openssl req -x509 -nodes -days 9999 -newkey rsa:2048 -keyout server.key -out server.crt -config req.conf -extensions req_ext -config ssl.con
