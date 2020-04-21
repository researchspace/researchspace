#!/bin/sh

set -e

# make files writable for owning group
umask 0002

# create admin password at first login
sh /firstStart/first-passwd-init.sh

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

if [ -n "$HEAPDEBUG" ]; then
# when out of memory create a heap dump in logs folder
export JAVA_TOOL_OPTS="$JAVA_TOOL_OPTS \
 -XX:+HeapDumpOnOutOfMemoryError \
 -XX:HeapDumpPath=/var/lib/jetty/logs"
fi

# GC options
# this creates a garbage collection log which can be inspected with gcViewer
# see https://github.com/chewiebug/GCViewer
#export JAVA_TOOL_OPTS="$JAVA_TOOL_OPTS \
# -Xloggc:/var/lib/jetty/logs/garbageCollection.log \
# -XX:+PrintGCDetails \
# -XX:+PrintGCDateStamps \
# -XX:+PrintGCTimeStamps \
# -XX:+UseGCLogFileRotation \
# -XX:NumberOfGCLogFiles=10 \
# -XX:GCLogFileSize=10M \
# -XX:+PrintGCCause"

# execute java command
exec java $JAVA_TOOL_OPTS $JAVA_OPTS -jar -Djava.io.tmpdir=$TMPDIR $JETTY_HOME/start.jar /usr/local/jetty/etc/jetty.xml /usr/local/jetty/etc/jetty-http-forwarded.xml $RUNTIME_OPTS $PLATFORM_OPTS
