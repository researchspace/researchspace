#!/bin/bash

set -e

chown -R 100:101 /apps
chown -R 100:101 /data
chown -R 100:101 /config

exec java $JAVA_OPTS -jar -Djava.io.tmpdir=$TMPDIR $JETTY_HOME/start.jar /usr/local/jetty/etc/jetty.xml /usr/local/jetty/etc/jetty-http-forwarded.xml $RUNTIME_OPTS $PLATFORM_OPTS
