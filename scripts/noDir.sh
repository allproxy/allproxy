#!/bin/bash

if [ -d "$1" ]; then
  exit 1; # exists
else
  exit 0; # doesn't exist
fi
