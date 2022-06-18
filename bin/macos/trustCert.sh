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

if [ "$1" == enable ]; then
    command security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $HOME/allproxy/ca.pem
else
    command security remove-trusted-cert -d $HOME/allproxy/ca.pem
fi
