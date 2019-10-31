#!/bin/bash


# http://stackoverflow.com/questions/59895/can-a-bash-script-tell-which-directory-it-is-stored-in/246128#246128
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done

SCRIPTPATH="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
JETTYFOLDER="$SCRIPTPATH/%s"

# change log4j2.xml for different logging profiles
# possible values log4j2-debug.xml, log4j2-trace.xml and log4j2-trace2.xml
LOG4J2="file://$JETTYFOLDER/webapps/ROOT/etc/log4j2.xml"
# whitespace encoding for filepath
LOG4J2="$(echo $LOG4J2 | sed 's/ /%%20/g')"

java -jar "$JETTYFOLDER/start.jar" jetty.base="$JETTYFOLDER" --module=logging-jetty  -Dorg.eclipse.jetty.server.Request.maxFormContentSize=100000000 -Djetty.http.port=10214 -Dcom.bigdata.rdf.sail.webapp.ConfigParams.propertyFile="$SCRIPTPATH/RWStore.properties" -Dcom.metaphacts.config.baselocation="$SCRIPTPATH/runtime-data/config" -DruntimeDirectory="$SCRIPTPATH/runtime-data" -DappsDirectory="$SCRIPTPATH/apps" -Dconfig.environment.shiroConfig="$SCRIPTPATH/runtime-data/config/shiro.ini" -Dlog4j.configurationFile="$LOG4J2"

