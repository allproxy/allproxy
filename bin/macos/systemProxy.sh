#!/usr/bin/env bash
set -euo pipefail

usage() {
    echo "Usage:"
    echo "  allproxy-system-proxy enable"
    echo "  allproxy-system-proxy disable"
    exit
}

command() {
    echo "$@"
    sudo "$@"
}

if [ "$#" != 1 ]; then
  usage
fi

OP=$@
if [ $@ == enable ]; then
    OP=enable
elif [ $@ == disable ]; then
    OP=disable
else
    usage
fi

if [ $OP == "enable" ]; then
    command networksetup -setwebproxy Wi-Fi 127.0.0.1 8888
    command networksetup -setsecurewebproxy Wi-Fi 127.0.0.1 8888
else
    command networksetup -setwebproxystate Wi-Fi off
    command networksetup -setsecurewebproxystate Wi-Fi off
fi
          