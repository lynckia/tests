#!/bin/sh

set -e

wait_for_hub() {
  echo Waiting for Hub at $HUB_PORT_4444_TCP_ADDR
  while ! (curl http://$HUB_PORT_4444_TCP_ADDR:4444 > /dev/null 2>&1); do
    echo -n .
    sleep 1
  done
  echo
}

wait_for_licode() {
  echo Waiting for Licode at $LICODE_ADDR
  while ! (curl http://$LICODE_ADDR:3001 > /dev/null 2>&1); do
    echo -n .
    sleep 1
  done
  echo
}

if [ "$1" = "start" ]
then
  echo Initializing
  wait_for_hub
  wait_for_licode
  echo Starting
  npm test
fi
