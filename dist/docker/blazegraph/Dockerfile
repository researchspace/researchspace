# build blazegraph vocabularios for CIDOC-CRM using gradle
FROM gradle:6.5.0-jdk8
COPY vocabularies /vocabularies
WORKDIR /vocabularies
RUN gradle build

# assemble blazegraph jetty image
FROM jetty:9.4.27-jre11
MAINTAINER ResearchSpace researchspace@britishmuseum.org
LABEL maintainer="ResearchSpace researchspace@britishmuseum.org"

ARG BLAZEGRAPH_URL=https://oss.sonatype.org/content/repositories/snapshots/com/blazegraph/blazegraph-war/2.2.0-SNAPSHOT/blazegraph-war-2.2.0-20160908.003514-6.war

USER root

COPY --chown=jetty:jetty jetty-logging.properties /var/lib/jetty/resources/jetty-logging.properties
COPY --chown=jetty:jetty entrypoint.sh /entrypoint.sh
COPY --chown=jetty:jetty RWStore.properties /config/RWStore.properties

RUN echo "Fetching blazegraph.war from ${BLAZEGRAPH_URL}" \
 && wget -O "$TMPDIR/blazegraph.war" "${BLAZEGRAPH_URL}" \
 && unzip "$TMPDIR/blazegraph.war" -d "$JETTY_BASE/webapps/blazegraph" \
 && chown -R jetty:jetty "$JETTY_BASE/webapps/blazegraph" \
 && rm "$TMPDIR/blazegraph.war"

COPY --chown=jetty:jetty --from=0 /vocabularies/build/libs/vocabularies.jar $JETTY_BASE/webapps/blazegraph/WEB-INF/lib/ 

RUN mkdir /blazegraph-data && chown -R jetty:jetty /blazegraph-data

ENV QUERY_TIMEOUT=0

USER jetty

# enable jetty logging configuration module
RUN java -jar "$JETTY_HOME/start.jar" --add-to-start="logging-jetty"

ENTRYPOINT ["/entrypoint.sh"]
VOLUME /blazegraph-data
