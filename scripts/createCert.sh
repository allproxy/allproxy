#!/bin/bash
DIR=./private/keys
DAYS=1000

openssl req -x509 -nodes -keyout $DIR/server.key -out $DIR/server.crt -days $DAYS
