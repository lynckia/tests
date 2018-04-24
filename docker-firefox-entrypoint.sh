#!/bin/sh


pulseaudio -D --disable-shm --exit-idle-time=-1
pacmd load-module module-virtual-sink sink_name=v1
pacmd set-default-sink v1


exec /opt/bin/entry_point.sh
