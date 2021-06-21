#!/bin/sh

set -e

# make files writable for owning group
umask 0002

# JVM settings to show effective config flags
export JAVA_TOOL_OPTS=" \
 -XX:+PrintCommandLineFlags \
 -XshowSettings"

# JVM settings to apply memory settings from container constraints
export JAVA_TOOL_OPTS="$JAVA_TOOL_OPTS \
 -XX:InitialRAMPercentage=30.0 \
 -XX:MaxRAMPercentage=75.0"

# other misc options
export JAVA_TOOL_OPTS="$JAVA_TOOL_OPTS \
 -Djava.awt.headless=true"

RUNTIME_OPTS=" \
 -Dcom.bigdata.rdf.sail.webapp.ConfigParams.propertyFile=/config/RWStore.properties \
 -Dorg.eclipse.jetty.server.Request.maxFormContentSize=104857600"

# execute java command
exec java $JAVA_TOOL_OPTS $JAVA_OPTS -jar -Djava.io.tmpdir=$TMPDIR $JETTY_HOME/start.jar $RUNTIME_OPTS /usr/local/jetty/etc/jetty.xml /usr/local/jetty/etc/jetty-http-forwarded.xml $FCREPO_OPTS
