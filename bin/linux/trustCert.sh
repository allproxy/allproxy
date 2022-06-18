#!/bin/bash

usage() {
    echo "Usage:"
    echo "  trustCert.sh enable"
    echo "  trustCert.sh disable"
    exit
}

command() {
    echo "$@"
    sudo "$@"
}

if [ "$1" != enable && "$1" != disable]; then
    usage
fi

if [ "$1" == enable ]; then
    command cp $HOME/allproxy/ca.pem /usr/local/share/ca-certificates/allproxyca.pem
else
    command rm /usr/local/share/ca-certificates/allproxyca.pem
fi