#!/bin/sh
./node_modules/forever/bin/forever \
 start \
 -al forever.log \
 -ao logs/normal.log \
 -ae logs/error.log \
app.js
